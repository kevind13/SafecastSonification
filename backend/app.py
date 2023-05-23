from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
import numpy as np
import torch
import requests
import base64
import scipy.io as sio
import io

from mid2matrix.matrix2mid import matrix2mid

MODEL_PATH = 'SAE_3_Layer_7_Latent_9216_2560_512/SAE_3_Layer_7_Latent_9216_2560_512.tar'
LATENT_PATH = 'SAE_3_Layer_7_Latent_9216_2560_512/latent/latent_project.mat'
ALL_LATENT_PATH = 'SAE_3_Layer_7_Latent_9216_2560_512/latent/all_latent_project.mat'

LATENT_DIM = 7
DEVICES_CACHE = {}

app = Flask(__name__)
CORS(app, support_credentials=True)

model = None
all_principal_components_statistics = []
current_params = []


def load_model():
    global model
    print("Loading model...")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    checkpoint = torch.load(MODEL_PATH, map_location=torch.device(device))  
    model = checkpoint['model']
    model.load_state_dict(checkpoint['model_state_dict'])


def load_latent():
    global all_principal_components_statistics
    global current_params

    project_mat = sio.loadmat(LATENT_PATH)
    all_project_mat = sio.loadmat(ALL_LATENT_PATH)

    principal_components = project_mat['latent_project']
    all_principal_components = all_project_mat['latent_project']
    all_principal_components = np.transpose(all_principal_components, (1,0))

    # print(all_principal_components.shape)
    
    all_principal_components_statistics = []
    z_scores_components = []
    for x in all_principal_components:
        z_scores = (x-np.mean(x))/np.std(x)
        z_scores_components.append(z_scores)
        all_principal_components_statistics.append({'x_min' : np.min(x), 'x_max': np.max(x), 'x_mean': np.mean(x), 'x_std': np.std(x), 'z_min' : np.min(z_scores), 'z_max' : np.max(z_scores), 'z_mean' : np.mean(z_scores), 'z_std': np.std(z_scores)})

    random_song_ix = 0 ## agregar randomness luego
    current_params = [principal_components[int(random_song_ix)]]


def midi_msg_formatter(msg):
    if msg.type == 'note_on' or msg.type == 'note_off':
        return {'type': msg.type, 'note': int(msg.note), 'time': float(msg.time), 'velocity': msg.velocity}

@app.route('/predict/<float_list>')
@cross_origin(supports_credentials=True)
def predict_latent(float_list):
    # Convert the input string to a list of floats
    input_data = [float(value) for value in float_list.split(',')]

    if len(input_data) != LATENT_DIM:
        return f'<div><h1>Model in construction!</h1><h2>But you still need to send {LATENT_DIM} values</h2></div>'
    
    if model is None:
        load_model()

    latent_current = torch.from_numpy(np.array([input_data])).float()

    if 'SAE' in type(model).__name__:
        X_recon = model.decoder_svd(latent_current)
    else:
        X_recon = model.decoder(latent_current)

    X_recon = X_recon.detach().numpy() 
    current_notes = np.argmax(X_recon.reshape((-1, X_recon.shape[-1])), axis=-1).reshape((X_recon.shape[1],X_recon.shape[2]))

    # try:
    #     print(current_notes)
    #     temp_midi_events = matrix2mid(current_notes.astype(int))
    #     current_midi_events = [msg for msg in temp_midi_events]
    #     return jsonify({'predictions': current_midi_events})
    # except:
    #     return jsonify('Error creating the midi file')
    
    # Codificar el archivo MIDI en base64
    temp_midi_events = matrix2mid(current_notes.astype(int))
    midi_buffer = io.BytesIO()
    temp_midi_events.save(file=midi_buffer)

    # Reset the buffer position to the beginning
    midi_buffer.seek(0)

    # Read the contents of the buffer and encode as base64
    encoded_midi = base64.b64encode(midi_buffer.read()).decode('utf-8')


    return jsonify({'midi_base64': encoded_midi})


@app.route('/predict', methods=['POST'])
@cross_origin(supports_credentials=True)
def predict():
    global current_params
    if model is None:
        load_model()
    data = request.get_json()

    mapping = data['mapping']
    start_date = data.get('from')
    format = data.get('format')

    if not isinstance(mapping, list) or any(not isinstance(item, dict) or 'component' not in item or 'device' not in item for item in mapping):
        return jsonify({'error': 'Invalid data format'})

    # Procesar los datos y realizar las predicciones
    devices = []
    components = []
    for item in mapping:
        components.append(item['component'])
        devices.append(item['device'])
    
    
    ## Check if the info of the device is in memory
    for device_id in devices:
        if device_id not in DEVICES_CACHE:
            list_of_values = []
            for page in range(1,10):
                url = f'https://api.safecast.org/en-US/measurements?device_id={device_id}&format=json&order=captured_at+desc&page={page}'
                response = requests.get(url)
                if response.status_code == 200:
                    data = response.json()
                    for measure in data:
                        list_of_values.append(measure['value'])
                else:
                    data = {'error': 'Failed to retrieve data'}
            DEVICES_CACHE[device_id] = {'avg': np.average(list_of_values) , 'std': np.std(list_of_values)}
    '''
        query para generar data entre dos fechas
        https://api.safecast.org/en-US/devices/107/measurements?page=4&since=2022-09-08+00%3A00&until=2023-09-09+00%3A00
    '''
    
    temp_current_params = np.array(current_params)
    for index, x in enumerate(components):
        z_latent = (current_params[0][x] - all_principal_components_statistics[x]['x_mean']) / all_principal_components_statistics[x]['x_std']

        temp_column_avg = DEVICES_CACHE[devices[index]]['avg']
        temp_column_std = DEVICES_CACHE[devices[index]]['std']

        url = f'https://api.safecast.org/en-US/measurements?device_id={devices[index]}&format=json'
        if start_date is not None:
            url = url + f'&since={start_date}'

        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            list_of_values = []
            for measure in data:
                list_of_values.append(measure['value'])
            temp_query_avg = np.average(list_of_values)
        else:
            raise Exception("Failed to retrieve data")

        print('component', x)
        print('temp query avg', temp_query_avg)
        print('current param', current_params[0][x])

        z_query = (temp_query_avg - temp_column_avg) / temp_column_std

        print('z temp query avg', z_query)
        print('z current param', (current_params[0][x]  - all_principal_components_statistics[x]['x_mean']) / all_principal_components_statistics[x]['x_std'])

        # new_z_latent = z_latent + z_query/100
        new_z_latent = z_query
        
        temp_current_params[0][x] = new_z_latent * all_principal_components_statistics[x]['x_std'] + all_principal_components_statistics[x]['x_mean']

    print(current_params)
    print(temp_current_params)

    latent_current = torch.from_numpy(np.array([temp_current_params])).float()

    if 'SAE' in type(model).__name__:
        X_recon = model.decoder_svd(latent_current)
    else:
        X_recon = model.decoder(latent_current)

    X_recon = X_recon.detach().numpy() 
    current_notes = np.argmax(X_recon.reshape((-1, X_recon.shape[-1])), axis=-1).reshape((X_recon.shape[1],X_recon.shape[2]))

    # try:
    temp_midi_events = matrix2mid(current_notes.astype(int))

    if format == 'base64':
        midi_buffer = io.BytesIO()
        temp_midi_events.save(file=midi_buffer)
        midi_buffer.seek(0)
        encoded_midi = base64.b64encode(midi_buffer.read()).decode('utf-8')
        return jsonify(encoded_midi)

    current_midi_events = [midi_msg_formatter(msg) for msg in temp_midi_events if midi_msg_formatter(msg) is not None]
    return jsonify(current_midi_events)
    # return f'<div><h1>Model in construction!</h1><h2>devices: {devices}</h2><h2>components: {components}</h2><h2>{DEVICES_CACHE}</h2><h2>{current_params}</h2><h2>{start_date}</h2></div>'


@app.route('/devices/')
@cross_origin(supports_credentials=True)
def get_external_data():
    page = request.args.get('page', default=1, type=int)
    url = f'https://api.safecast.org/en-US/devices?format=json&order=id+asc&page={page}'
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
    else:
        data = {'error': 'Failed to retrieve data'}
    return jsonify(data)

if __name__ == '__main__':
    load_model()
    load_latent()
    app.run(debug=True)