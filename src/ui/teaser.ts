// Тизер (#/). Тексты — в ТЗ, раздел «Тексты тизера для этапа 1».
export function renderTeaser(root: HTMLElement): void {
  root.innerHTML = `
    <p class="brand">Юрий Строфилов</p>
    <h1 class="big-white">Подкаст</h1>
    <a class="btn-main" href="#/play">Слушать</a>
    <img src="/cover-graphic.png" alt="" width="862" height="1537" style="width:100%;height:auto;display:block" />
  `;
}
