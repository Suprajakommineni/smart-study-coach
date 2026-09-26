import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Subject from "./pages/Subject";
import Module from "./pages/Module";
import Sources from "./pages/Sources";
import ConceptReview from "./pages/ConceptReview";
import QuestionBank from "./pages/QuestionBank";
import StudySession from "./pages/StudySession";
import Mastery from "./pages/Mastery";
import AuditLog from "./pages/AuditLog";

import Dashboardlayout from "./layout/Pagelayout";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnlyRoute from "./routes/PublicRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Dashboardlayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

           
            <Route
              path="/workspaces"
              element={<Workspace />}
            />

            
            <Route
              path="/workspaces/:workspaceId/subjects"
              element={<Subject />}
            />

            
            <Route
              path="/workspaces/:workspaceId/subjects/:subjectId/modules"
              element={<Module />}
            />

            
            <Route
              path="/workspaces/:workspaceId/subjects/:subjectId/modules/:moduleId/sources"
              element={<Sources />}
            />

            <Route
              path="/workspaces/:workspaceId/subjects/:subjectId/modules/:moduleId/sources/:sourceId/concepts"
              element={<ConceptReview />}
            />

            <Route
              path="/modules/:moduleId/questions"
              element={<QuestionBank />}
            />

            
            <Route
              path="/modules/:moduleId/study-session"
              element={<StudySession />}
            />

            <Route path="/mastery" element={<Mastery />} />

            <Route
              path="/auditlog"
              element={<AuditLog />}
            />

          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}