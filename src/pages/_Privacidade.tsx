import Layout from "@/components/layout/Layout";
import { FadeInUp } from "@/components/animations/MotionWrapper";

const Privacidade = () => {
  return (
    <Layout>
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-8">
              Política de Privacidade
            </h1>
            <p className="text-sm text-muted-foreground mb-12">
              Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>

            <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground text-sm leading-relaxed">
              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">1. Introdução</h2>
                <p>
                  A Amplify ("nós", "nosso" ou "empresa") está comprometida com a proteção da privacidade dos seus dados pessoais. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações quando você utiliza nosso site, serviços de consultoria, capacitações e demais soluções em Inteligência Artificial.
                </p>
                <p>
                  Esta política está em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD – Lei nº 13.709/2018) e demais legislações aplicáveis.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">2. Dados que Coletamos</h2>
                <p>Podemos coletar os seguintes tipos de dados pessoais:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-foreground">Dados de identificação:</strong> nome completo, e-mail, telefone e cargo profissional.</li>
                  <li><strong className="text-foreground">Dados empresariais:</strong> nome da empresa, segmento de atuação e porte.</li>
                  <li><strong className="text-foreground">Dados de navegação:</strong> endereço IP, tipo de navegador, páginas visitadas, tempo de permanência e cookies.</li>
                  <li><strong className="text-foreground">Dados de comunicação:</strong> mensagens enviadas via WhatsApp, formulários ou e-mail.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">3. Como Utilizamos seus Dados</h2>
                <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Prestar nossos serviços de consultoria, capacitação e soluções em IA;</li>
                  <li>Responder a solicitações e manter comunicação sobre nossos serviços;</li>
                  <li>Enviar conteúdos informativos, newsletters e materiais educativos (com seu consentimento);</li>
                  <li>Melhorar a experiência de navegação no site;</li>
                  <li>Cumprir obrigações legais e regulatórias;</li>
                  <li>Realizar análises estatísticas e de desempenho do site.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">4. Base Legal para o Tratamento</h2>
                <p>O tratamento dos seus dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-foreground">Consentimento:</strong> quando você fornece seus dados voluntariamente;</li>
                  <li><strong className="text-foreground">Execução de contrato:</strong> para prestação dos serviços contratados;</li>
                  <li><strong className="text-foreground">Legítimo interesse:</strong> para melhorias no site e comunicações relevantes;</li>
                  <li><strong className="text-foreground">Obrigação legal:</strong> para cumprimento de exigências legais.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">5. Compartilhamento de Dados</h2>
                <p>
                  Não vendemos, alugamos ou comercializamos seus dados pessoais. Podemos compartilhar informações apenas com:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Prestadores de serviços essenciais (hospedagem, analytics, CRM) sob acordos de confidencialidade;</li>
                  <li>Autoridades públicas, quando exigido por lei ou ordem judicial;</li>
                  <li>Parceiros comerciais, apenas com seu consentimento prévio.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">6. Cookies e Tecnologias de Rastreamento</h2>
                <p>
                  Utilizamos cookies e tecnologias similares para melhorar sua experiência de navegação, analisar o tráfego do site e personalizar conteúdo. Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">7. Segurança dos Dados</h2>
                <p>
                  Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso não autorizado, destruição, perda, alteração ou qualquer forma de tratamento inadequado. Isso inclui criptografia, controles de acesso e monitoramento contínuo.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">8. Retenção de Dados</h2>
                <p>
                  Seus dados pessoais serão armazenados pelo tempo necessário para cumprir as finalidades descritas nesta política, ou conforme exigido por obrigações legais, contratuais ou regulatórias.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">9. Seus Direitos</h2>
                <p>De acordo com a LGPD, você tem os seguintes direitos:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Confirmar a existência de tratamento de dados;</li>
                  <li>Acessar seus dados pessoais;</li>
                  <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                  <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
                  <li>Solicitar a portabilidade dos dados;</li>
                  <li>Revogar o consentimento a qualquer momento;</li>
                  <li>Obter informações sobre compartilhamento de dados.</li>
                </ul>
                <p>
                  Para exercer qualquer desses direitos, entre em contato conosco pelo WhatsApp{" "}
                  <a href="https://wa.me/5511918252109" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    +55 11 91825-2109
                  </a>.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">10. Alterações nesta Política</h2>
                <p>
                  Reservamo-nos o direito de atualizar esta Política de Privacidade a qualquer momento. Quaisquer alterações serão publicadas nesta página com a data de atualização. Recomendamos que você revise esta política periodicamente.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">11. Contato</h2>
                <p>
                  Para dúvidas, solicitações ou reclamações sobre esta Política de Privacidade ou o tratamento dos seus dados pessoais, entre em contato:
                </p>
                <ul className="list-none space-y-1">
                  <li><strong className="text-foreground">Amplify</strong></li>
                  <li>São Paulo, SP – Brasil</li>
                  <li>
                    WhatsApp:{" "}
                    <a href="https://wa.me/5511918252109" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      +55 11 91825-2109
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default Privacidade;
