import Layout from "@/components/layout/Layout";
import { FadeInUp } from "@/components/animations/MotionWrapper";
import { Link } from "react-router-dom";

const Termos = () => {
  return (
    <Layout>
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-8">
              Termos de Uso
            </h1>
            <p className="text-sm text-muted-foreground mb-12">
              Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>

            <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground text-sm leading-relaxed">
              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">1. Aceitação dos Termos</h2>
                <p>
                  Ao acessar e utilizar o site da Amplify, você concorda com estes Termos de Uso e com nossa{" "}
                  <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>. 
                  Caso não concorde com qualquer disposição, recomendamos que não utilize nosso site ou serviços.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">2. Descrição dos Serviços</h2>
                <p>
                  A Amplify oferece serviços de educação corporativa, consultoria em Inteligência Artificial, capacitações, comunidades profissionais e ferramentas em IA. Este site apresenta informações sobre nossos serviços, cases de sucesso, conteúdos educativos e canais de contato.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">3. Uso do Site</h2>
                <p>Ao utilizar nosso site, você concorda em:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Fornecer informações verdadeiras, atuais e completas quando solicitado;</li>
                  <li>Não utilizar o site para fins ilegais ou não autorizados;</li>
                  <li>Não tentar acessar áreas restritas do site sem autorização;</li>
                  <li>Não interferir no funcionamento ou segurança do site;</li>
                  <li>Não reproduzir, distribuir ou modificar qualquer conteúdo sem autorização prévia.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">4. Propriedade Intelectual</h2>
                <p>
                  Todo o conteúdo presente neste site — incluindo textos, imagens, logotipos, vídeos, materiais de capacitação, metodologias e softwares — é de propriedade da Amplify ou de seus licenciadores, protegido pelas leis brasileiras de propriedade intelectual e direitos autorais (Lei nº 9.610/98).
                </p>
                <p>
                  É proibida a reprodução, distribuição, modificação ou uso comercial de qualquer conteúdo sem autorização expressa e por escrito da Amplify.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">5. Conteúdo e Informações</h2>
                <p>
                  As informações, artigos e materiais publicados neste site têm caráter informativo e educativo. Embora nos esforcemos para manter o conteúdo atualizado e preciso, não garantimos que todas as informações estejam completas ou livres de erros.
                </p>
                <p>
                  O conteúdo do site não substitui consultoria profissional especializada. Decisões de negócios devem ser tomadas com acompanhamento adequado.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">6. Serviços e Contratações</h2>
                <p>
                  A contratação de serviços da Amplify (consultoria, capacitações, comunidades) é formalizada por meio de contratos específicos, propostas comerciais ou termos de adesão próprios, que prevalecerão sobre estes Termos de Uso em caso de conflito.
                </p>
                <p>
                  O contato inicial para contratação é realizado via WhatsApp ou outros canais disponibilizados no site.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">7. Links para Terceiros</h2>
                <p>
                  Nosso site pode conter links para sites de terceiros. A Amplify não se responsabiliza pelo conteúdo, políticas de privacidade ou práticas de sites externos. Recomendamos que você leia os termos e políticas de cada site que visitar.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">8. Limitação de Responsabilidade</h2>
                <p>
                  A Amplify não será responsável por danos diretos, indiretos, incidentais ou consequentes decorrentes do uso ou impossibilidade de uso do site, incluindo, mas não se limitando a:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Interrupções temporárias no acesso ao site;</li>
                  <li>Erros ou imprecisões no conteúdo publicado;</li>
                  <li>Perda de dados decorrente do uso do site;</li>
                  <li>Ações de terceiros que afetem o funcionamento do site.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">9. Disponibilidade do Site</h2>
                <p>
                  Nos esforçamos para manter o site disponível 24 horas por dia, 7 dias por semana. No entanto, o acesso pode ser interrompido temporariamente para manutenção, atualizações ou por fatores fora do nosso controle, sem aviso prévio.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">10. Alterações nos Termos</h2>
                <p>
                  A Amplify reserva-se o direito de modificar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação no site. O uso continuado do site após alterações constitui aceitação dos novos termos.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">11. Legislação Aplicável e Foro</h2>
                <p>
                  Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo, Estado de São Paulo, para dirimir quaisquer controvérsias decorrentes destes termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">12. Contato</h2>
                <p>
                  Para dúvidas ou solicitações sobre estes Termos de Uso, entre em contato:
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

export default Termos;
