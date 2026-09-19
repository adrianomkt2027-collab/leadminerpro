import { Pickaxe, Zap, Search, MessageSquare, BarChart3, Shield, ArrowRight, Building2, FileSearch, Phone, MapPin, Filter, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const features = [
  {
    icon: Search,
    title: "Mineração Google Maps",
    description: "Extraia leads qualificados do Google Maps por cidade e nicho com dados completos: telefone, email, site e endereço.",
  },
  {
    icon: Building2,
    title: "Extrator de CNPJ",
    description: "Busque empresas por CNAE, UF e município direto da base oficial. Filtre por porte, situação cadastral e obtenha telefones, e-mails e capital social.",
  },
  {
    icon: BarChart3,
    title: "Scoring Automático",
    description: "Cada lead recebe pontuações de oportunidade e dor, ajudando você a priorizar os melhores contatos.",
  },
  {
    icon: MessageSquare,
    title: "Disparo via WhatsApp",
    description: "Envie mensagens personalizadas em massa via Evolution API com controle de velocidade e variações automáticas.",
  },
  {
    icon: Zap,
    title: "Agendamento de Disparos",
    description: "Agende envios para o momento ideal. Controle lotes, pausas e delays para simular envio humano.",
  },
  {
    icon: Shield,
    title: "Painel Administrativo",
    description: "Gerencie usuários, permissões e controle de cadastros. Visão completa de todos os disparos realizados.",
  },
];

const cnpjFeatures = [
  {
    icon: FileSearch,
    title: "Busca por Atividade (CNAE)",
    description: "Pesquise por mais de 1.300 atividades econômicas e encontre empresas do seu nicho exato.",
  },
  {
    icon: MapPin,
    title: "Filtro por Localização",
    description: "Filtre por UF e município com carregamento dinâmico. Encontre empresas na sua região de atuação.",
  },
  {
    icon: Phone,
    title: "Somente Celular",
    description: "Ative o filtro para capturar apenas números de celular — ideal para envios via WhatsApp.",
  },
  {
    icon: Database,
    title: "Dados Completos",
    description: "Razão social, nome fantasia, telefones, e-mail, endereço, capital social, sócios e situação cadastral.",
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Pickaxe className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Lead Miner</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <Button size="sm" onClick={() => navigate("/dashboard")}>
                Acessar Painel <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")}>
                Entrar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeIn}>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Zap className="h-3.5 w-3.5" />
            Mineração de leads automatizada
          </div>
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight"
          variants={fadeIn}
        >
          Encontre leads qualificados.
          <br />
          <span className="text-primary">Converta com WhatsApp.</span>
        </motion.h1>

        <motion.p
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          variants={fadeIn}
        >
          Lead Miner extrai dados do Google Maps e da base oficial de CNPJs, pontua oportunidades 
          automaticamente e dispara mensagens personalizadas via WhatsApp — tudo em uma única plataforma.
        </motion.p>

        <motion.div className="mt-10 flex items-center justify-center gap-4" variants={fadeIn}>
          {session ? (
            <Button size="lg" onClick={() => navigate("/dashboard")} className="text-base px-8">
              Acessar Painel <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <>
              <Button size="lg" onClick={() => navigate("/auth")} className="text-base px-8">
                Começar Agora <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-base px-8">
                Fazer Login
              </Button>
            </>
          )}
        </motion.div>
      </motion.section>

      {/* Features */}
      <motion.section
        className="mx-auto max-w-6xl px-6 pb-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <motion.div className="text-center mb-12" variants={fadeIn}>
          <h2 className="text-3xl font-bold tracking-tight">Tudo que você precisa para prospectar</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Da extração ao primeiro contato, Lead Miner automatiza todo o fluxo de prospecção.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <motion.div key={feature.title} variants={fadeIn}>
              <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CNPJ Extractor Section */}
      <motion.section
        className="border-t border-border bg-card/50"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div className="text-center mb-14" variants={fadeIn}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Building2 className="h-3.5 w-3.5" />
              Extrator de CNPJ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Acesse a maior base de empresas do Brasil
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Busque diretamente na base da Receita Federal por atividade econômica, estado e cidade. 
              Obtenha dados detalhados como telefones, e-mails, capital social e sócios — prontos para prospecção.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {cnpjFeatures.map((feature) => (
              <motion.div key={feature.title} variants={fadeIn}>
                <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-10 text-center" variants={fadeIn}>
            <p className="text-muted-foreground mb-4">
              Mais de <span className="font-semibold text-foreground">1.300 atividades econômicas</span> disponíveis para pesquisa, 
              com filtros por <span className="font-semibold text-foreground">todos os 26 estados + DF</span> e municípios carregados dinamicamente.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* How it works */}
      <motion.section
        className="border-t border-border"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div className="text-center mb-14" variants={fadeIn}>
            <h2 className="text-3xl font-bold tracking-tight">Como funciona</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Em 3 passos simples, você sai do zero ao contato direto com seu cliente ideal.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Extraia leads",
                description: "Use o Google Maps ou o Extrator de CNPJ para encontrar empresas do seu nicho com dados completos.",
              },
              {
                step: "02",
                title: "Qualifique e filtre",
                description: "O scoring automático prioriza os melhores contatos. Valide números de WhatsApp antes de disparar.",
              },
              {
                step: "03",
                title: "Dispare mensagens",
                description: "Envie mensagens personalizadas em massa com controle de velocidade, agendamento e variações.",
              },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeIn} className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="border-t border-border bg-card"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
      >
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Pronto para minerar seus primeiros leads?</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Crie sua conta gratuitamente e comece a extrair leads qualificados em segundos.
          </p>
          <Button
            size="lg"
            className="mt-8 text-base px-8"
            onClick={() => navigate(session ? "/dashboard" : "/auth")}
          >
            {session ? "Acessar Painel" : "Criar Conta Grátis"} <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Pickaxe className="h-4 w-4" />
            <span>Lead Miner</span>
          </div>
          <span>© {new Date().getFullYear()} Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
