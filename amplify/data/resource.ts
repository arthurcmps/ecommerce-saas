import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Store: a.model({
    storeId: a.id().required(),
    name: a.string().required(),
    documentNumber: a.string().required(),
    phone: a.string().required(),
    email: a.string().required(),
    address: a.json(),
    themeConfig: a.json(),
  })
    .identifier(['storeId'])
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['read']),
    ]),

  Product: a.model({
    sellerId: a.string().required(),
    storeId: a.id().required(),
    name: a.string().required(),
    price: a.float().required(),
    description: a.string(),
    category: a.string(),
    imagePath: a.string(),
    stock: a.integer().default(0),
    availableVariations: a.string().array(),
    shippingDimensions: a.json(),
    isActive: a.boolean().default(true),
  }).authorization((allow) => [
    allow.owner(),
    allow.publicApiKey().to(['read']),
  ]),

  Customer: a.model({
    customerId: a.id().required(),
    name: a.string().required(),
    phone: a.string().required(),
    email: a.string().required(),
    role: a.string().default('customer'),
    address: a.json(),
  })
    .identifier(['customerId'])
    .authorization((allow) => [allow.owner()]),

  Order: a.model({
    sellerId: a.string().required(),
    storeId: a.id().required(),
    customerId: a.id(),
    buyerName: a.string().required(),
    buyerPhone: a.string().required(),
    buyerAddress: a.json(),
    paymentMethod: a.string(),
    paymentStatus: a.string().default('pendente'),
    freightMethod: a.string(),
    freightCost: a.float().default(0),
    items: a.json().required(),
    totalAmount: a.float().required(),
    status: a.string().default('novo'),
  }).authorization((allow) => [
    allow.ownerDefinedIn('sellerId').to(['read', 'update', 'delete']),
    allow.publicApiKey().to(['create']),
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
