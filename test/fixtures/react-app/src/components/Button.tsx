interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ label, onClick, variant }: ButtonProps): JSX.Element {
  return <button onClick={onClick} className={variant}>{label}</button>;
}
