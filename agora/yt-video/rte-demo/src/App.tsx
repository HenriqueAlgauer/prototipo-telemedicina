import { useState } from "react";
import AppBuilder from "@appbuilder/react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <AppBuilder.View />
    </div>
  );
}

export default App;
