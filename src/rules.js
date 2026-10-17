// "Rules" side panel (HTML, readable text) with icons taken from the game sprites.
import { getSprite } from './sprites.js';
import { getLang } from './i18n.js';

const ICONS = ['icon_mag', 'icon_bullet', 'icon_grenade', 'icon_hostage', 'icon_soldier', 'icon_heli',
  'icon_vehicle', 'icon_drink', 'icon_mg', 'crate', 'chicken1'];

// Small copies of the on-screen buttons, so the rules show exactly what to press.
const BTN = {
  grenade: '<span class="btn-demo round red"><svg viewBox="0 0 16 16"><path fill="currentColor" d="M6 1h4v2h3v2h-1v-1h-2v1h1v1h1v1h1v6h-1v1h-1v1H5v-1H4v-1H3V7h1V6h1V5h1z"/></svg></span>',
  pause: '<span class="btn-demo"><svg viewBox="0 0 16 16"><path fill="currentColor" d="M3 2h4v12H3zM9 2h4v12H9z"/></svg></span>',
  full: '<span class="btn-demo"><svg viewBox="0 0 16 16"><path fill="currentColor" d="M1 1h5v2H3v3H1zM10 1h5v5h-2V3h-3zM1 10h2v3h3v2H1zM13 10h2v5h-5v-2h3z"/></svg></span>',
  rules: '<span class="btn-demo yellow">?</span>',
};

function icon(name) {
  return `<img class="ico" alt="" src="${getSprite(name).toDataURL()}">`;
}

// {icon_mag} placeholders are replaced with sprite images.
const TEXT = {
  ru: `
<div class="god">
<button type="button" class="god-btn" data-act="god"></button>
<p>Бессмертие: урон не отнимается. По умолчанию выключено и выключается после перезагрузки страницы. Можно включить кнопкой выше или набрать на клавиатуре <kbd>W</kbd> <kbd>O</kbd> <kbd>L</kbd> <kbd>F</kbd>.</p>
</div>
<h2>Цель</h2>
<p>Ты — спецназовец по прозвищу Волк. Пройди 6 миссий на карте операции, уничтожь врагов и освободи заложников.</p>

<h2>Управление</h2>
<p><b>Компьютер:</b> мышь — прицел, левая кнопка — выстрел (держи — очередь), правая кнопка или <kbd>Пробел</kbd> — граната. <kbd>P</kbd> или <kbd>Esc</kbd> — пауза, <kbd>M</kbd> — звук.</p>
<p><b>Планшет и телефон:</b> коснись — выстрел в эту точку, держи палец — очередь, веди пальцем — прицел следует. Красная кнопка — граната: нажми её, потом коснись места, куда бросить.</p>

<h2>Кнопки на планшете</h2>
<table class="btns">
<tr><td>👆</td><td><b>Коснись экрана</b> — выстрел точно в это место. Держи палец — стреляет очередью. Веди пальцем — прицел едет за ним.</td></tr>
<tr><td>{btn:grenade}</td><td><b>Граната</b> (справа внизу, видна в бою). Нажми — кнопка замигает. Потом коснись места на экране — граната полетит туда. Нажми ещё раз — отмена. Если один палец уже стреляет, граната летит сразу в прицел.</td></tr>
<tr><td>{btn:pause}</td><td><b>Пауза</b> (справа вверху, в бою). Чтобы продолжить — коснись экрана.</td></tr>
<tr><td>{btn:rules}</td><td><b>Правила</b> — эта страница. Игра на это время встаёт на паузу.</td></tr>
<tr><td>{btn:full}</td><td><b>Во весь экран</b> (слева вверху). На iPad её нет — вместо неё открой игру в Safari, нажми «Поделиться» → «На экран Домой» и запускай с иконки: будет без панелей браузера.</td></tr>
</table>
<p>Держи планшет <b>горизонтально</b> — так экран больше. Меню и карта миссий — тоже касанием: коснись миссии, потом «СТАРТ».</p>

<h2>Панель внизу</h2>
<ul>
<li>{icon_mag} запасные магазины</li>
<li>{icon_bullet} патроны в магазине (перезарядка сама)</li>
<li>{icon_grenade} гранаты</li>
<li>{icon_hostage} спасено заложников</li>
<li>{icon_soldier} {icon_heli} {icon_vehicle} сколько ещё уничтожить солдат, вертолётов и техники. Все на нуле — миссия пройдена.</li>
<li>Полоска справа из 10 делений — <b>здоровье</b>. Каждое попадание отнимает кусочек, рамка вспыхивает красным. Здоровье кончилось — игра окончена. Есть 2 продолжения.</li>
</ul>

<h2>Бонусы</h2>
<p>Стреляй по ящикам {crate} и курицам {chicken1} — из них выпадают бонусы. Попади по бонусу, чтобы забрать:</p>
<ul>
<li>{icon_mag} магазин +1</li>
<li>{icon_grenade} граната +1</li>
<li>{icon_drink} энергетик — здоровье +5</li>
<li>{icon_mg} пулемёт — 10 секунд стрельбы без перезарядки</li>
</ul>

<h2>Враги</h2>
<ul>
<li>Солдаты в зелёном стреляют, в хаки — кидают гранаты, в синем — метают ножи (их надо подстрелить дважды).</li>
<li>Гранаты, ножи, ракеты и снаряды летят прямо в экран — <b>их можно сбить выстрелом!</b></li>
<li>Вертолёт, БТР и катер выдерживают много пуль. Граната выносит их за 2 попадания.</li>
</ul>

<h2>Свои</h2>
<p>Не стреляй в медиков с носилками, мальчишек и заложников — за это урон и штраф. На лёгкой сложности штрафа нет.</p>

<h2>Заложники</h2>
<p>В Концлагере и Аэропорту заложники бегут к левому краю экрана. За ними гонится охранник — подстрели его, пока он не выстрелил. Нужно спасти хотя бы одного, иначе миссию придётся пройти заново.</p>

<h2>Миссии и награды</h2>
<ol>
<li><b>Узел связи</b> — в остальных миссиях станет меньше солдат.</li>
<li><b>Джунгли</b> — откроет Концлагерь.</li>
<li><b>Деревня</b> — вернёт 20 здоровья.</li>
<li><b>Склад боеприпасов</b> — полный запас магазинов и гранат.</li>
<li><b>Концлагерь</b> — откроет Аэропорт.</li>
<li><b>Аэропорт</b> — финал с боевым вертолётом.</li>
</ol>
<p>Порядок выбираешь сам. Чем больше заложников спасёшь, тем лучше концовка.</p>

<h2>Сложность</h2>
<p><b>Лёгкая</b> — для детей: враги стреляют реже и слабее, патронов и гранат больше, прицел прощает промахи, нет штрафа за своих.</p>

<h2>Бессмертие</h2>
<p>По умолчанию выключено. На клавиатуре набери подряд <kbd>W</kbd> <kbd>O</kbd> <kbd>L</kbd> <kbd>F</kbd> — урон перестанет отниматься, в бою замигает надпись «БЕССМЕРТИЕ». Набери ещё раз — выключится. После перезагрузки страницы бессмертие всегда выключено.</p>
`,
  en: `
<div class="god">
<button type="button" class="god-btn" data-act="god"></button>
<p>Immortality: you take no damage. Off by default and after every page reload. Use the button above, or type <kbd>W</kbd> <kbd>O</kbd> <kbd>L</kbd> <kbd>F</kbd> on the keyboard.</p>
</div>
<h2>Goal</h2>
<p>You are a commando called Wolf. Clear 6 missions on the operation map, destroy the enemy and free the hostages.</p>

<h2>Controls</h2>
<p><b>Computer:</b> mouse aims, left button fires (hold for auto fire), right button or <kbd>Space</kbd> throws a grenade. <kbd>P</kbd> or <kbd>Esc</kbd> pauses, <kbd>M</kbd> toggles sound.</p>
<p><b>Tablet and phone:</b> tap to shoot at that spot, hold for auto fire, slide to move the aim. The red button is a grenade: press it, then tap where to throw.</p>

<h2>Tablet buttons</h2>
<table class="btns">
<tr><td>👆</td><td><b>Touch the screen</b> to shoot exactly there. Keep your finger down for auto fire. Slide it and the aim follows.</td></tr>
<tr><td>{btn:grenade}</td><td><b>Grenade</b> (bottom right, shown in battle). Press it and it starts blinking, then touch a spot — the grenade flies there. Press again to cancel. If another finger is already firing, the grenade goes straight to the aim.</td></tr>
<tr><td>{btn:pause}</td><td><b>Pause</b> (top right, in battle). Touch the screen to continue.</td></tr>
<tr><td>{btn:rules}</td><td><b>Rules</b> — this page. The game pauses while it is open.</td></tr>
<tr><td>{btn:full}</td><td><b>Full screen</b> (top left). iPad doesn't have it: open the game in Safari, tap Share → Add to Home Screen and start it from the icon — no browser bars.</td></tr>
</table>
<p>Hold the tablet <b>sideways</b> for a bigger picture. Menus and the mission map work by touch too: touch a mission, then START.</p>

<h2>Bottom panel</h2>
<ul>
<li>{icon_mag} spare magazines</li>
<li>{icon_bullet} bullets in the magazine (reloads by itself)</li>
<li>{icon_grenade} grenades</li>
<li>{icon_hostage} hostages saved</li>
<li>{icon_soldier} {icon_heli} {icon_vehicle} soldiers, helicopters and vehicles left to destroy. All zero — mission complete.</li>
<li>The 10-segment bar on the right is your <b>health</b>. Every hit takes a piece and the frame flashes red. When it runs out, the game is over. You get 2 continues.</li>
</ul>

<h2>Items</h2>
<p>Shoot crates {crate} and chickens {chicken1} to make items drop. Shoot an item to take it:</p>
<ul>
<li>{icon_mag} magazine +1</li>
<li>{icon_grenade} grenade +1</li>
<li>{icon_drink} energy drink — health +5</li>
<li>{icon_mg} machine gun — 10 seconds without reloading</li>
</ul>

<h2>Enemies</h2>
<ul>
<li>Green soldiers shoot, khaki ones throw grenades, blue ones throw knives (hit them twice).</li>
<li>Grenades, knives, rockets and shells fly at the screen — <b>you can shoot them down!</b></li>
<li>Helicopters, armoured cars and boats take many bullets. Two grenades destroy them.</li>
</ul>

<h2>Friends</h2>
<p>Don't shoot medics with stretchers, boys or hostages — you get damage and lose points. No penalty on Easy.</p>

<h2>Hostages</h2>
<p>In the Prison Camp and the Airport, hostages run to the left edge of the screen. A guard chases them — shoot him before he fires. Save at least one, or you will have to replay the mission.</p>

<h2>Missions and rewards</h2>
<ol>
<li><b>Communication Setup</b> — fewer soldiers in other missions.</li>
<li><b>Jungle</b> — unlocks the Prison Camp.</li>
<li><b>Village</b> — restores 20 health.</li>
<li><b>Powder Magazine</b> — full magazines and grenades.</li>
<li><b>Prison Camp</b> — unlocks the Airport.</li>
<li><b>Airport</b> — the finale with a gunship.</li>
</ol>
<p>You choose the order. The more hostages you save, the better the ending.</p>

<h2>Difficulty</h2>
<p><b>Easy</b> is for kids: enemies shoot less and weaker, more ammo and grenades, forgiving aim, no penalty for hitting friends.</p>

<h2>Immortality</h2>
<p>Off by default. Type <kbd>W</kbd> <kbd>O</kbd> <kbd>L</kbd> <kbd>F</kbd> on the keyboard and you stop taking damage; "IMMORTAL" blinks in battle. Type it again to turn it off. Reloading the page always turns it off.</p>
`,
};

export function rulesHtml() {
  const src = TEXT[getLang()] || TEXT.en;
  return src
    .replace(/\{btn:(\w+)\}/g, (m, name) => BTN[name] || m)
    .replace(/\{(\w+)\}/g, (m, name) => (ICONS.includes(name) ? icon(name) : m));
}
