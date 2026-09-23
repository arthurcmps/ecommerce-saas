import './aws-config.js';
import { getCurrentUser } from 'aws-amplify/auth';
import { client, unwrapJson } from './aws-config.js';

export async function requireMerchant() {
  try {
    const user = await getCurrentUser();
    const { data: store, errors } = await client.models.Store.get({ storeId: user.userId });

    if (errors?.length) {
      console.error('Erro ao carregar loja:', errors);
    }

    return { user, store: store || null };
  } catch (error) {
    window.location.href = 'index.html';
    throw error;
  }
}

export function storeAddress(store) {
  return unwrapJson(store?.address, {});
}

export function storeTheme(store) {
  return unwrapJson(store?.themeConfig, {});
}
