import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 14 de fevereiro de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar ou utilizar a plataforma Lead Miner, você concorda com estes Termos de Uso. 
              Caso não concorde com qualquer parte destes termos, você não deve utilizar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Lead Miner é uma plataforma de prospecção inteligente que permite a extração de dados públicos 
              do Google Maps, pontuação de oportunidades e envio de mensagens via WhatsApp. O serviço é 
              fornecido "como está" e pode ser atualizado ou modificado a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Conta do Usuário</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar o serviço, você deve criar uma conta com informações verdadeiras e completas. 
              Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas 
              as atividades realizadas em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Uso Aceitável</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Ao utilizar o Lead Miner, você concorda em:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Utilizar o serviço em conformidade com todas as leis aplicáveis, incluindo a LGPD</li>
              <li>Não utilizar a plataforma para envio de spam ou mensagens não solicitadas em massa</li>
              <li>Respeitar os limites de uso e não tentar contornar restrições do sistema</li>
              <li>Não compartilhar suas credenciais de acesso com terceiros</li>
              <li>Não utilizar o serviço para fins ilegais ou prejudiciais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Privacidade e Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Respeitamos sua privacidade e protegemos seus dados pessoais. Os dados coletados pela plataforma 
              são utilizados exclusivamente para fornecer e melhorar o serviço. Não compartilhamos seus dados 
              pessoais com terceiros sem seu consentimento, exceto quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo, design, código e funcionalidades da plataforma Lead Miner são de propriedade 
              exclusiva dos seus criadores. É proibida a reprodução, distribuição ou modificação sem 
              autorização prévia por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Lead Miner não se responsabiliza por danos diretos, indiretos, incidentais ou consequenciais 
              resultantes do uso ou impossibilidade de uso do serviço. O usuário é o único responsável pelo 
              uso que faz dos dados obtidos através da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Suspensão e Encerramento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de suspender ou encerrar sua conta a qualquer momento, sem aviso prévio, 
              caso haja violação destes termos de uso ou uso inadequado da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos podem ser atualizados periodicamente. Alterações significativas serão comunicadas 
              através da plataforma. O uso continuado do serviço após as alterações constitui aceitação dos 
              novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas ou solicitações relacionadas a estes termos, entre em contato através do 
              administrador da plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
