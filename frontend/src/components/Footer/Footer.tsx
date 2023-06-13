import style from './Footer.module.css';

const Footer = () => {
  return (
    <div className={style.container}>
      {/* <div>
        <span>De Colombia pal mundo</span>
        <img
          src="https://assets.website-files.com/60d7d2e0002c46899b0aeeb8/61003abf691b46bc8eed1fb9_Colombia_Heart.png"
          loading="lazy"
          alt="heart"
        />
      </div> */}
      <a href='https://onkyo.u-aizu.ac.jp/#/'>
      Onkyo laboratory
      </a>
      <div>
      University of Aizu
      </div>
    </div>
  );
};

export default Footer;
