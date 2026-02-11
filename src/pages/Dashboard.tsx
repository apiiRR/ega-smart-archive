import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Send, ArrowRightLeft, ScrollText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const stats = [
  { label: "Surat Masuk", value: "0", icon: Inbox, color: "text-blue-600" },
  { label: "Surat Keluar", value: "0", icon: Send, color: "text-emerald-600" },
  { label: "Disposisi Pending", value: "0", icon: ArrowRightLeft, color: "text-amber-600" },
  { label: "Total Arsip", value: "0", icon: ScrollText, color: "text-purple-600" },
];

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang, {profile?.name || "Pengguna"}. Berikut ringkasan aktivitas Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Belum ada aktivitas. Data akan tampil setelah Anda mulai menggunakan sistem.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
