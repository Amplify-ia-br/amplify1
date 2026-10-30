import { describe, expect, it } from 'vitest';
import { publicSiteAnswer } from './presentation.js';
describe('public identity', () => {
 it('uses CRIATOWN for the group without rewriting canonical product names or addresses', () => {
  expect(publicSiteAnswer('A Amplify disponibiliza materiais. A escola decide com a Amplify.'))
    .toBe('A CRIATOWN disponibiliza materiais. A escola decide com a CRIATOWN.');
  expect(publicSiteAnswer('Amplify Academy: https://amplify.ia.br e oi@amplify.ia.br'))
    .toBe('Amplify Academy: https://amplify.ia.br e oi@amplify.ia.br');
 });
});
