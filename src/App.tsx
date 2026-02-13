import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MasterDirectorates from "./pages/MasterDirectorates";
import MasterDivisions from "./pages/MasterDivisions";
import MasterUsers from "./pages/MasterUsers";
import SuratMasuk from "./pages/SuratMasuk";
import SuratKeluar from "./pages/SuratKeluar";
import Disposisi from "./pages/Disposisi";
import TemplateSurat from "./pages/TemplateSurat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="master/directorates" element={<MasterDirectorates />} />
              <Route path="master/divisions" element={<MasterDivisions />} />
              <Route path="master/users" element={<MasterUsers />} />
              <Route path="surat-masuk" element={<SuratMasuk />} />
              <Route path="surat-keluar" element={<SuratKeluar />} />
              <Route path="disposisi" element={<Disposisi />} />
              <Route path="template-surat" element={<TemplateSurat />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
