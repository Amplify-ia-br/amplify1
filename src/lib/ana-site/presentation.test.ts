import { describe, expect, it } from 'vitest';
import { publicSiteAnswer, unsafeSiteAnswer } from './presentation.js';
describe('public identity', () => {
 it('uses CRIATOWN for the group without rewriting canonical product names or addresses', () => {
  expect(publicSiteAnswer('A Amplify disponibiliza materiais. A escola decide com a Amplify.'))
    .toBe('A CRIATOWN disponibiliza materiais. A escola decide com a CRIATOWN.');
  expect(publicSiteAnswer('Amplify Academy: https://amplify.ia.br e oi@amplify.ia.br'))
    .toBe('Amplify Academy: https://amplify.ia.br e oi@amplify.ia.br');
 });
 it('rejects internal payloads and unrecorded confirmation, while allowing ordinary help', () => {
  expect(unsafeSiteAnswer('{"consentQuote":"Autorizo","contact":"qa@example.invalid"}Perfeito.', false)).toBe(true);
  expect(unsafeSiteAnswer('Já anotei seu pedido para o time dar sequência.', false)).toBe(true);
  expect(unsafeSiteAnswer('Seu pedido foi encaminhado ao time.', false)).toBe(true);
  expect(unsafeSiteAnswer('Posso compartilhar seu contato e o resumo com o time?', false)).toBe(false);
  expect(unsafeSiteAnswer('Anotei seu pedido.', true)).toBe(false);
 });
});
