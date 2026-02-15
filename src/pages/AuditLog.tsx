import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext, PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Activity, Calendar, User, Filter } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import type { Tables } from "@/integrations/supabase/types";

type AuditLog = Tables<"audit_logs"> & { profile_name?: string };

const actionColors: Record<string, string> = {
  login: "bg-blue-100 text-blue-800",
  logout: "bg-gray-100 text-gray-800",
  create: "bg-green-100 text-green-800",
  update: "bg-amber-100 text-amber-800",
  delete: "bg-red-100 text-red-800",
  approve: "bg-emerald-100 text-emerald-800",
  reject: "bg-rose-100 text-rose-800",
  dispose: "bg-purple-100 text-purple-800",
};

const actionLabels: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  create: "Buat",
  update: "Ubah",
  delete: "Hapus",
  approve: "Setujui",
  reject: "Tolak",
  dispose: "Disposisi",
};

const moduleLabels: Record<string, string> = {
  auth: "Autentikasi",
  surat_masuk: "Surat Masuk",
  surat_keluar: "Surat Keluar",
  disposisi: "Disposisi",
  template_surat: "Template Surat",
  master_directorates: "Direktorat",
  master_divisions: "Divisi",
  master_users: "Pengguna",
  rbac: "RBAC",
};

const PAGE_SIZE = 15;

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      // Fetch profile names for user_ids
      const userIds = [...new Set((data as AuditLog[]).map(l => l.user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.id, p.name]));
        }
      }

      return (data as AuditLog[]).map(log => ({
        ...log,
        profile_name: log.user_id ? profileMap[log.user_id] || "Unknown" : "System",
      }));
    },
  });

  // Derive unique modules & actions for filter dropdowns
  const modules = [...new Set(logs.map(l => l.module))].sort();
  const actions = [...new Set(logs.map(l => l.action))].sort();

  // Filter
  const filtered = logs.filter(log => {
    if (moduleFilter !== "all" && log.module !== moduleFilter) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.profile_name?.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.target_table?.toLowerCase().includes(q) ||
        log.old_state?.toLowerCase().includes(q) ||
        log.new_state?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderPageNumbers = () => {
    const pages: React.ReactNode[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      pages.push(
        <PaginationItem key={1}><PaginationLink onClick={() => setPage(1)}>1</PaginationLink></PaginationItem>
      );
      if (start > 2) pages.push(<PaginationItem key="es"><PaginationEllipsis /></PaginationItem>);
    }
    for (let i = start; i <= end; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={i === page} onClick={() => setPage(i)}>{i}</PaginationLink>
        </PaginationItem>
      );
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<PaginationItem key="ee"><PaginationEllipsis /></PaginationItem>);
      pages.push(
        <PaginationItem key={totalPages}><PaginationLink onClick={() => setPage(totalPages)}>{totalPages}</PaginationLink></PaginationItem>
      );
    }
    return pages;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy, HH:mm", { locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  const renderJsonDetail = (label: string, value: string | null) => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-48 whitespace-pre-wrap">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      );
    } catch {
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-sm bg-muted rounded-md p-3 break-all">{value}</p>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
        <p className="text-muted-foreground mt-1">
          Riwayat seluruh aktivitas pengguna dalam sistem. Data bersifat immutable.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Log</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hari Ini</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => {
                const today = new Date().toDateString();
                return new Date(l.created_at).toDateString() === today;
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pengguna Aktif</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.map(l => l.user_id).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari log..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Semua Modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Modul</SelectItem>
            {modules.map(m => (
              <SelectItem key={m} value={m}>{moduleLabels[m] || m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aksi</SelectItem>
            {actions.map(a => (
              <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Modul</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="w-16 text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {logs.length === 0
                    ? "Belum ada log aktivitas. Log akan muncul saat pengguna melakukan aksi di sistem."
                    : "Tidak ada log yang cocok dengan filter."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((log, idx) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.profile_name}
                  </TableCell>
                  <TableCell>
                    <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                      {actionLabels[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {moduleLabels[log.module] || log.module}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {log.target_table ? `${log.target_table}` : "-"}
                    {log.target_id ? ` #${String(log.target_id).slice(0, 8)}` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDetailLog(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} log
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {renderPageNumbers()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Log Aktivitas</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waktu</p>
                  <p className="mt-0.5">{formatDate(detailLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pengguna</p>
                  <p className="mt-0.5 font-medium">{detailLog.profile_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aksi</p>
                  <Badge className={`mt-0.5 ${actionColors[detailLog.action] || "bg-gray-100 text-gray-800"}`}>
                    {actionLabels[detailLog.action] || detailLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modul</p>
                  <p className="mt-0.5">{moduleLabels[detailLog.module] || detailLog.module}</p>
                </div>
                {detailLog.target_table && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tabel Target</p>
                    <p className="mt-0.5">{detailLog.target_table}</p>
                  </div>
                )}
                {detailLog.target_id && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID Target</p>
                    <p className="mt-0.5 font-mono text-xs">{detailLog.target_id}</p>
                  </div>
                )}
                {detailLog.ip_address && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP Address</p>
                    <p className="mt-0.5 font-mono text-xs">{detailLog.ip_address}</p>
                  </div>
                )}
              </div>

              {renderJsonDetail("State Sebelum", detailLog.old_state)}
              {renderJsonDetail("State Sesudah", detailLog.new_state)}
              {detailLog.details && renderJsonDetail("Detail Tambahan", JSON.stringify(detailLog.details))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
