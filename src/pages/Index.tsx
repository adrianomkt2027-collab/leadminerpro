import DashboardStats from "@/components/DashboardStats";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { LayoutDashboard } from "lucide-react";

const Index = () => {
  return (
    <div className="bg-background">
      <motion.main
        className="mx-auto max-w-6xl px-6 py-8 space-y-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Painel de Controle</h1>
            <p className="text-sm text-muted-foreground">Visão geral da sua prospecção</p>
          </div>
        </motion.div>

        <DashboardStats />
      </motion.main>
    </div>
  );
};

export default Index;
