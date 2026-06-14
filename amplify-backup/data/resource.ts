import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Product: a.model({
    name: a.string().required(),
    price: a.float().required(),
    stock: a.integer().required(),
    category: a.string(),
    description: a.string(),
    image_url: a.string(),
    storeId: a.string().required(), // Para saber de que loja é o produto
  }).authorization(allow => [allow.publicApiKey()]), // Permite testes iniciais
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 30 }
  },
});