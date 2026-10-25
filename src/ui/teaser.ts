import { podcast } from '../data/podcast';

// Тизер (#/). Тексты — из ТЗ, раздел «Тексты тизера для этапа 1».
const CONTENTS = [
  'Гены и тонкая грань',
  'Пот и плацебо',
  'Ящерицы и сила воли',
  'Кортизол и ракетный двигатель',
  'Инсулин и тридцатый километр',
  'Интервалы и урановые рудники',
  'Мед без пчел и ниппель Данлопа',
  'Письма и калоши',
  'Вундеркинды и счастье',
];

export function renderTeaser(root: HTMLElement): void {
  const count = podcast.episodes.length;
  root.innerHTML = `
    <div class="screen teaser">
      <header class="teaser-cover">
        <p class="eyebrow">${podcast.podcast.author}</p>
        <h1 class="teaser-title">Подкаст</h1>
        <p class="lead">${count} эпизодов. Читает автор.</p>
        <a class="btn-main" href="#/play">Слушать</a>
      </header>

      <img class="cover-graphic" src="${import.meta.env.BASE_URL}cover-graphic.png" alt="«Не про бег»: бегун в кроссовках, вид сверху" width="862" height="1537" />

      <section class="block">
        <h2 class="h2">О чём подкаст</h2>
        <p>Первый марафон Юрий Строфилов пробежал в день своего пятидесятилетия, 9 января 2015 года, в Тверии на берегу Галилейского моря. Потом были Нью-Йорк, Бостон, Токио, Берлин, Лондон и Чикаго.</p>
        <p>Между стартами — главы о кортизоле и капиллярах, интервалах и пульсе, пиве, пшенице и силе воли. Ссылок на исследования не будет: автор раздаёт кубики для картины мира, собирать её каждый будет сам.</p>
        <p>Книга «Не про бег» вышла в издательстве «Манн, Иванов и Фербер» в 2019 году. В подкасте её читает автор.</p>
        <figure class="quote">
          <blockquote>«Занятость — это современная лень»</blockquote>
          <figcaption>Из главы «Марафон и поэты»</figcaption>
        </figure>
      </section>

      <section class="block">
        <h2 class="h2">Из оглавления</h2>
        <p class="sub">45 глав книги в ${count} эпизодах</p>
        <ul class="contents">${CONTENTS.map((c) => `<li>${c}</li>`).join('')}</ul>
      </section>

      <section class="block">
        <h2 class="h2">Как слушать</h2>
        <ol class="steps">
          <li><span class="step-n">1</span><span>Нажмите «Слушать». Плеер запомнит, где вы остановились.</span></li>
          <li><span class="step-n">2</span><span>Уберите телефон в карман: с выключенным экраном звук продолжится.</span></li>
          <li><span class="step-n">3</span><span>Добавьте сайт на домашний экран, чтобы открывать его одним нажатием.</span></li>
        </ol>
      </section>

      <a class="btn-main" href="#/play">Слушать</a>
      <p class="footnote"><span class="age">18+</span> Аудиоверсия книги «Не про бег». Читает Юрий Строфилов.</p>
    </div>
  `;
}
