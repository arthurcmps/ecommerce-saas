import { client, unwrapJson } from './aws-config.js';
import { requireMerchant } from './session.js';
import { renderSidebar, updateSidebarData } from './sidebar.js';

const dashboardContent = document.getElementById('dashboard-content');
const designForm = document.getElementById('design-form');
const primaryColorInput = document.getElementById('primary-color');
const secondaryColorInput = document.getElementById('secondary-color');
const primaryHexDisplay = document.getElementById('primary-hex');
const secondaryHexDisplay = document.getElementById('secondary-hex');
const vitrineStyleSelect = document.getElementById('vitrine-style');
const btnSaveDesign = document.getElementById('btn-save-design');

let currentUserId = null;

renderSidebar('design');

primaryColorInput.addEventListener('input', (e) => {
  primaryHexDisplay.innerText = e.target.value;
});
secondaryColorInput.addEventListener('input', (e) => {
  secondaryHexDisplay.innerText = e.target.value;
});

async function init() {
  try {
    const { user, store } = await requireMerchant();
    currentUserId = user.userId;
    dashboardContent.style.display = 'flex';

    if (store) {
      updateSidebarData(store.name, user.userId);
      const theme = unwrapJson(store.themeConfig, {});
      primaryColorInput.value = theme.primary_color || '#1A202C';
      secondaryColorInput.value = theme.secondary_color || '#ED8936';
      primaryHexDisplay.innerText = primaryColorInput.value;
      secondaryHexDisplay.innerText = secondaryColorInput.value;
      vitrineStyleSelect.value = theme.home_layout?.vitrine_style || 'grid';
    }
  } catch (error) {
    console.error('Erro ao carregar design:', error);
  }
}

designForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUserId) return;

  const originalText = btnSaveDesign.innerText;
  btnSaveDesign.innerText = 'A guardar...';
  btnSaveDesign.disabled = true;

  try {
    const { errors } = await client.models.Store.update({
      storeId: currentUserId,
      themeConfig: {
        primary_color: primaryColorInput.value,
        secondary_color: secondaryColorInput.value,
        home_layout: {
          vitrine_style: vitrineStyleSelect.value,
        },
      },
    });

    if (errors?.length) throw new Error(errors.map((item) => item.message).join('; '));
    alert('Design atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar o design:', error);
    alert('Ocorreu um erro ao guardar as alterações.');
  } finally {
    btnSaveDesign.innerText = originalText;
    btnSaveDesign.disabled = false;
  }
});

init();
