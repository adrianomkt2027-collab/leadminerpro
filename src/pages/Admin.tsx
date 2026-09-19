import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, Mail, Calendar, Trash2, Users, UserPlus } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserWithRole {
  user_id: string;
  email: string;
  created_at: string;
  role: string;
  dispatches_count: number;
  dispatches_success: number;
  dispatches_errors: number;
  instances: string[];
}

const AdminPage = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [togglingSignup, setTogglingSignup] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);

    // Get profiles (admin can see all via RLS)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, created_at")
      .order("created_at", { ascending: true });

    if (!profiles) { setLoading(false); return; }

    // Get roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Get dispatch stats per user
    const { data: dispatches } = await supabase
      .from("scheduled_dispatches")
      .select("user_id, status, results, sent_count");

    // Get instances per user
    const { data: instances } = await supabase
      .from("saved_instances")
      .select("user_id, instance_name");

    const usersData: UserWithRole[] = profiles.map((p) => {
      const userRole = roles?.find((r) => r.user_id === p.user_id);
      const userDispatches = dispatches?.filter((d) => d.user_id === p.user_id) || [];
      const userInstances = instances?.filter((i) => i.user_id === p.user_id) || [];

      const completedDispatches = userDispatches.filter((d) => d.status === "completed");
      const totalSent = completedDispatches.reduce((sum, d) => sum + (d.sent_count || 0), 0);

      return {
        user_id: p.user_id,
        email: p.email || "—",
        created_at: p.created_at,
        role: userRole?.role || "user",
        dispatches_count: totalSent,
        dispatches_success: totalSent,
        dispatches_errors: 0,
        instances: userInstances.map((i) => i.instance_name),
      };
    });

    setUsers(usersData);
    setLoading(false);
  };

  const fetchSignupSetting = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "signup_enabled")
      .single();
    setSignupEnabled(data?.value === "true");
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSignupSetting();
    }
  }, [isAdmin]);

  const handleToggleSignup = async (enabled: boolean) => {
    setTogglingSignup(true);
    const { error } = await supabase
      .from("system_settings")
      .update({ value: enabled ? "true" : "false", updated_at: new Date().toISOString() })
      .eq("key", "signup_enabled");

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSignupEnabled(enabled);
      toast({ title: enabled ? "Cadastros habilitados" : "Cadastros desabilitados" });
    }
    setTogglingSignup(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === session?.user?.id && newRole !== "admin") {
      toast({ title: "Erro", description: "Você não pode remover seu próprio papel de admin.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as "admin" | "user" })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Atualizado!", description: `Role alterado para ${newRole}.` });
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: newRole } : u));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === session?.user?.id) {
      toast({ title: "Erro", description: "Você não pode deletar sua própria conta.", variant: "destructive" });
      return;
    }

    // We can't delete auth.users from client, so we just remove their role and profile
    const { error: roleErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error: profileErr } = await supabase.from("profiles").delete().eq("user_id", userId);

    if (roleErr || profileErr) {
      toast({ title: "Erro", description: "Falha ao remover usuário.", variant: "destructive" });
    } else {
      toast({ title: "Removido!", description: "Usuário removido." });
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Acesso Negado</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
            <Button onClick={() => navigate("/dashboard")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <motion.main
        className="mx-auto max-w-6xl px-6 py-8 space-y-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Administração</h1>
            <p className="text-sm text-muted-foreground">Gerencie usuários e configurações do sistema</p>
          </div>
        </motion.div>
        {/* Signup control */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Controle de Cadastro</p>
                    <p className="text-sm text-muted-foreground">Habilite ou desabilite novos cadastros na plataforma</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${signupEnabled ? "text-emerald-400" : "text-destructive"}`}>
                    {signupEnabled ? "Habilitados" : "Desabilitados"}
                  </span>
                  <Switch
                    checked={!signupEnabled}
                    onCheckedChange={(checked) => handleToggleSignup(!checked)}
                    disabled={togglingSignup}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-4" variants={staggerItem}>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Usuários</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{users.filter((u) => u.role === "admin").length}</p>
              <p className="text-xs text-muted-foreground mt-1">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{users.reduce((s, u) => s + u.dispatches_count, 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Total de envios</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Users table */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Usuários Cadastrados
              </CardTitle>
              <CardDescription>{users.length} usuários no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Instâncias</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Envios</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cadastro</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.user_id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {user.instances.length > 0 ? user.instances.map((inst) => (
                                <Badge key={inst} variant="secondary" className="text-[10px]">{inst}</Badge>
                              )) : <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{user.dispatches_count}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={user.role}
                              onValueChange={(val) => handleRoleChange(user.user_id, val)}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(user.created_at).toLocaleDateString("pt-BR")}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={user.user_id === session?.user?.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso removerá o perfil e role de {user.email}. A conta de autenticação permanecerá.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)}>
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.main>
    </div>
  );
};

export default AdminPage;
