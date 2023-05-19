import React, { useState } from 'react';
import style from './Button.module.css';
import { cls } from '../../utils/styles';
import ActivityIndicator from '../ActivityIndicator/ActivityIndicator';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title?: string;
  className?: string;
}

const Button = ({ title, className, onClick, ...props }: ButtonProps) => {
  const [loading, setLoading] = useState<boolean>(false);

  const _onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick) return;

    setLoading(true);
    const res = await onClick(e);
    setLoading(false);
    return res;
  };

  return (
    <button
      className={cls(style.btn, className)}
      onClick={_onClick}
      {...props}>
      {!loading && title}
      {loading && <ActivityIndicator />}
    </button>
  );
};

export default Button;
