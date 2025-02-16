import type React from "react";
import ClientMusicGenerator from "../../../components/ClientMusicGenerator";

const GenerateMusic: React.FC = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ClientMusicGenerator />
    </div>
  );
};

export default GenerateMusic;
