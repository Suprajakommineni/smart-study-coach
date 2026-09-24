import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import WorkSpace from "./pages/Workspace";
import Subject from "./pages/Subject";
import Module from "./pages/Module";
import Source from "./pages/Sources";
import ConceptReview from "./pages/ConceptReview";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/workspaces" element={<WorkSpace />} />

          <Route
            path="/workspaces/:workspaceId/subjects"
            element={<Subject />}
          />

          <Route
            path="/workspaces/:workspaceId/subjects/:subjectId/modules"
            element={<Module />}
          />

<Route path="/modules/:moduleId/sources" element={<Source />} />
          <Route path="/sources/:sourceId/concepts" element={<ConceptReview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
