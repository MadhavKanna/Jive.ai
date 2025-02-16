import type React from "react";
import MusicGenerator from "../../components/MusicGenerator";

const Home: React.FC = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <MusicGenerator />
    </div>
  );
};

export default Home;
