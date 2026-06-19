import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import SetupPage from "./pages/SetupPage";
import InterviewPage from "./pages/InterviewPage";
import ReportPage from "./pages/ReportPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/setup"
          element={<SetupPage />}
        />

        <Route
          path="/interview"
          element={<InterviewPage />}
        />

        <Route
          path="/report"
          element={<ReportPage />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;