import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProtectedRoute from "./components/ProtectedRoute";
import SetupPage from "./pages/SetupPage";
import InterviewPage from "./pages/InterviewPage";
import ReportPage from "./pages/ReportPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/signup"
          element={<SignupPage />}
        />

        <Route element={<ProtectedRoute />}>
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
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;