import { useEffect } from "react";

const Contato = () => {
  useEffect(() => {
    window.location.href = "https://wa.me/5511918252109";
  }, []);

  return null;
};

export default Contato;
