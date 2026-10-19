import type { LabProfileId } from "./lab/profiles.js";

export type TestMission = {
  id: string;
  title: string;
  brief: string;
};

export const TEST_MISSIONS: TestMission[] = [
  {
    id: "dono-escola",
    title: "Dono de escola",
    brief: "Você tem uma escola particular e quer entender como levar IA para os alunos. Converse até sentir que sabe o próximo passo.",
  },
  {
    id: "gestor-escola",
    title: "Gestor de escola",
    brief: "Seu interesse é a gestão: processos, equipe e automações. Veja se a Ana entende que não é o programa dos alunos.",
  },
  {
    id: "pai-mae",
    title: "Pai ou mãe",
    brief: "Seu filho está no 9º ano e você quer saber se ele pode participar e o que ele vai fazer.",
  },
  {
    id: "professor",
    title: "Professor",
    brief: "Você dá aula e tem receio de que a IA atrapalhe. Pergunte como a Amplify pode ajudar o professor.",
  },
  {
    id: "empresa",
    title: "Empresa",
    brief: "Você tem uma empresa e quer automatizar processos. Veja se a Ana conduz sem empurrar o programa de escolas.",
  },
  {
    id: "cetico",
    title: "Cético",
    brief: "Você acha que IA é modinha. Provoque, discorde e responda curto (\"ok\", \"sei\") para ver se a conversa morre.",
  },
  {
    id: "curioso",
    title: "Curioso sem rumo",
    brief: "Você caiu aqui sem saber o que quer. Escreva de forma vaga, com erros de digitação, e mude de assunto no meio.",
  },
  {
    id: "livre",
    title: "Livre",
    brief: "Converse como quiser. Tente quebrar a Ana: perguntas fora do tema, pedidos estranhos, mensagens longas.",
  },
];

export const MISSION_IDS = TEST_MISSIONS.map((mission) => mission.id) as [string, ...string[]];

export const MISSION_MAPPING_VERSION = "2026-10-v1";

export const DEFAULT_MISSION_BY_PROFILE: Record<LabProfileId, string> = {
  dono_escola: "dono-escola",
  gestor_educacional: "gestor-escola",
  professor: "professor",
  profissional_empresa: "empresa",
  estudante: "livre",
  outro: "livre",
};

export function recommendedMissionForProfile(profile?: string) {
  return DEFAULT_MISSION_BY_PROFILE[profile as LabProfileId] ?? "livre";
}
