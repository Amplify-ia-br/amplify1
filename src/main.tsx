import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import * as webVitals from "web-vitals";

createRoot(document.getElementById("root")!).render(<App />);

// Web Vitals measurement
webVitals.getCLS(console.log);
webVitals.getFID(console.log);
webVitals.getFCP(console.log);
webVitals.getLCP(console.log);
webVitals.getTTFB(console.log);
