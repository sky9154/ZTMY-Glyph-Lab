import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "motion/react";

import { App } from "@app/App";
import "@styles/global.css";
import "@styles/viewer.css";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>
);