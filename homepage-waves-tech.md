# Волны и фон на главной B.A. Holding

## Назначение

Этот документ фиксирует, как именно устроены фоновые волны и фон на главной странице проекта, чтобы можно было воспроизвести тот же визуальный подход в другом проекте через `Gemini 3.1 Pro` без догадок и упрощений.

## Источники в проекте

- Главная страница: `src/app/page.tsx`
- Подключение глобальных стилей: `src/app/layout.tsx`
- Глобальные фоны и волны: `src/app/globals.css`
- Отдельный hero-фон первого экрана: `src/components/Hero.tsx`

## Краткая архитектура

На главной используются два разных механизма фона:

1. Верхний `hero` экран.
2. Переиспользуемые фоновые секции с волнами.

Важно:

- `hero` не использует классы `section-dark` / `section-light`
- волны на остальных секциях реализованы не отдельным SVG-компонентом, а через CSS-псевдоэлементы `::before` и `::after`
- сами волны зашиты в `data:image/svg+xml`
- мягкие цветовые свечения сделаны набором `radial-gradient`
- движение создаётся двумя независимыми анимациями: для glow-слоёв и для wave-слоёв

## Где и как это используется на главной

Главная собирается из секций в `src/app/page.tsx`:

- `Hero`
- `About`
- `Directions`
- `Advantages`
- `Projects`
- `Investors`
- `Careers`
- `ContactCTA`
- `Footer`

Фоновые волны чередуются так:

- `About` -> `section-light`
- `Directions` -> `section-dark`
- `Advantages` -> `section-light`
- `Projects` -> `section-dark`
- `Investors` -> `section-light`
- `Careers` -> `section-dark`
- `ContactCTA` -> `section-light`

То есть в проекте заложен паттерн чередования светлых и тёмных волнистых секций.

## Базовый фон всего сайта

Это фоновая подложка всего `body`, поверх которой уже живут секции:

```css
body {
  background:
    radial-gradient(circle at top left, rgba(86, 124, 223, 0.22), transparent 26%),
    radial-gradient(circle at bottom right, rgba(34, 77, 170, 0.2), transparent 28%),
    linear-gradient(180deg, #153160 0%, #10244b 100%);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.5;
  overflow-x: hidden;
}
```

### Что это даёт

- верхний левый источник синего свечения
- нижний правый источник более тёмного синего свечения
- основную вертикальную синюю растяжку фона
- скрытие горизонтального переполнения, чтобы анимированные волны не рвали вьюпорт

## Механика волнистых секций

Волны завязаны на два класса:

- `.section-dark`
- `.section-light`

Оба класса используют одинаковую техническую схему:

- сам блок получает `position: relative` и `isolation: isolate`
- `::before` отвечает за glow и подложку
- `::after` отвечает за волнистые SVG-линии
- все дочерние элементы поднимаются на `z-index: 1`, чтобы контент был над волнами

Точная общая механика:

```css
.section-dark,
.section-light {
  position: relative;
  isolation: isolate;
}

.section-dark::before,
.section-light::before,
.section-dark::after,
.section-light::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.section-dark::before,
.section-light::before {
  z-index: 0;
  background-repeat: no-repeat;
  opacity: 1;
  animation: sectionGlowDrift 26s ease-in-out infinite;
}

.section-dark::after,
.section-light::after {
  inset: -4%;
  z-index: 0;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  opacity: 0.95;
  will-change: transform;
  animation: sectionWaveDrift 34s ease-in-out infinite alternate;
}

.section-dark > *,
.section-light > * {
  position: relative;
  z-index: 1;
}
```

## Анимации

Используются две анимации.

### 1. Смещение glow-слоёв

```css
@keyframes sectionGlowDrift {
  0% {
    background-position: center, center, center, center, center;
  }

  50% {
    background-position: -24px -18px, 26px 18px, 14px -10px, center, center;
  }

  100% {
    background-position: center, center, center, center, center;
  }
}
```

### 2. Плавный дрейф самих волн

```css
@keyframes sectionWaveDrift {
  0% {
    transform: translate3d(0, 0, 0) scale(1.03);
  }

  50% {
    transform: translate3d(-1.2%, 0.8%, 0) scale(1.045);
  }

  100% {
    transform: translate3d(1.1%, -0.6%, 0) scale(1.03);
  }
}
```

### Почему это работает визуально

- glow-слои двигаются очень медленно и почти незаметно
- SVG-волны не скроллятся, а будто плавают в пространстве
- `scale(1.03)` и `inset: -4%` не дают появляться пустым краям при анимации
- `alternate` делает движение спокойным, без резкого возврата в стартовую точку

## Тёмная версия секций

Это технически основной вариант фирменного фона для тёмных блоков.

### Базовый цвет

```css
.section-dark {
  background-color: #08152f;
}
```

### Glow-слой тёмной версии

```css
.section-dark::before {
  background-image:
    radial-gradient(circle at top left, rgba(96, 142, 255, 0.26), transparent 22%),
    radial-gradient(circle at 78% 12%, rgba(25, 68, 161, 0.42), transparent 28%),
    radial-gradient(circle at 18% 100%, rgba(48, 108, 226, 0.22), transparent 30%),
    linear-gradient(180deg, rgba(9, 23, 52, 0.98), rgba(5, 13, 30, 0.99));
  background-size: auto, auto, auto, 1400px 100%, auto;
  background-position: center, center, center, center, center;
}
```

### SVG-волны тёмной версии

```css
.section-dark::after {
  background-image: url("data:image/svg+xml,%3Csvg width='1600' height='900' viewBox='0 0 1600 900' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-120 125C115 30 278 248 520 150C770 48 924 262 1190 145C1398 54 1550 106 1730 20' stroke='%234b76da' stroke-opacity='0.22' stroke-width='2'/%3E%3Cpath d='M-140 305C84 214 258 442 492 350C732 255 928 455 1182 352C1385 270 1544 336 1735 262' stroke='%236792f1' stroke-opacity='0.15' stroke-width='2'/%3E%3Cpath d='M-150 520C90 430 250 642 520 552C785 462 944 662 1188 562C1392 478 1548 532 1735 468' stroke='%23365ec0' stroke-opacity='0.18' stroke-width='2'/%3E%3Cpath d='M-130 738C112 648 270 842 520 760C760 680 944 858 1180 760C1392 672 1544 724 1732 662' stroke='%236186e5' stroke-opacity='0.16' stroke-width='2'/%3E%3C/svg%3E");
}
```

### Что важно сохранить при переносе

- ширина SVG: `1600`
- высота SVG: `900`
- 4 отдельные волнистые линии
- тонкая обводка: `stroke-width='2'`
- прозрачные синие оттенки вместо жирных заливок
- линии выходят за пределы экрана, а не начинаются ровно по краям

## Светлая версия секций

Светлый вариант использует ту же механику, но с более мягкой подложкой и менее агрессивными оттенками.

### Базовый цвет

```css
.section-light {
  background-color: #f7fbff;
  color: #183b79;
}
```

### Glow-слой светлой версии

```css
.section-light::before {
  background-image:
    radial-gradient(circle at top right, rgba(118, 159, 245, 0.2), transparent 24%),
    radial-gradient(circle at bottom left, rgba(67, 118, 230, 0.14), transparent 28%),
    radial-gradient(circle at 16% 18%, rgba(86, 124, 223, 0.08), transparent 18%),
    linear-gradient(180deg, rgba(252, 253, 255, 0.98), rgba(242, 248, 255, 0.99));
  background-size: auto, auto, auto, 1400px 100%, auto;
  background-position: center, center, center, center, center;
}
```

### SVG-волны светлой версии

```css
.section-light::after {
  background-image: url("data:image/svg+xml,%3Csvg width='1600' height='900' viewBox='0 0 1600 900' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-110 115C122 12 286 226 520 132C770 32 928 238 1196 130C1412 44 1552 96 1738 4' stroke='%23567cdf' stroke-opacity='0.2' stroke-width='2'/%3E%3Cpath d='M-136 298C94 206 266 426 506 336C752 244 942 442 1192 344C1400 262 1548 320 1730 248' stroke='%237ea2f0' stroke-opacity='0.12' stroke-width='2'/%3E%3Cpath d='M-150 512C88 420 252 628 522 540C790 452 952 648 1196 548C1412 460 1556 512 1742 452' stroke='%23456ed0' stroke-opacity='0.16' stroke-width='2'/%3E%3Cpath d='M-130 735C114 646 278 838 532 754C778 672 956 850 1198 754C1414 668 1560 720 1740 660' stroke='%236a90ea' stroke-opacity='0.16' stroke-width='2'/%3E%3C/svg%3E");
}
```

## Accessibility: отключение анимации

В проекте уже учтён `prefers-reduced-motion`.

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .section-dark::before,
  .section-light::before,
  .section-dark::after,
  .section-light::after {
    animation: none;
  }
}
```

Это важно сохранить при переносе, иначе новый проект потеряет базовую поддержку reduced motion.

## Hero первого экрана

Первый экран сделан отдельно от волнистых секций.

### Техническая схема hero

Hero состоит из трёх фоновых слоёв:

1. Основная картинка `hero.webp`
2. Радиальные цветовые пятна поверх картинки
3. Тёмный прозрачный overlay для затемнения и читаемости текста

### Точный фрагмент из `Hero.tsx`

```tsx
<motion.div 
  initial={{ opacity: 0, scale: 1.05 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 1.5, ease: "easeOut" }}
  className="absolute inset-0 z-0"
>
  <Image
    src="/home/hero.webp"
    alt="B.A. Holding hero background"
    fill
    priority
    sizes="100vw"
    className="object-cover"
  />
  <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_left,_rgba(110,154,255,0.26),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(52,104,214,0.22),_transparent_28%)]"></div>
  <div className="absolute inset-0 bg-[#0D1A3A]/62 z-10"></div>
</motion.div>
```

### Что здесь важно

- hero не рисуется CSS-псевдоэлементами, а собирается реальными DOM-слоями
- картинка отвечает за фактуру и глубину
- radial overlay добавляет фирменный синий свет
- тёмный overlay стабилизирует контраст белого текста
- используется лёгкий `scale`-fade при появлении

## Смысл слоёв по z-index

Порядок слоёв в волнистых секциях такой:

1. сам фон секции
2. `::before` с glow и gradient-подложкой
3. `::after` со SVG-волнами
4. контент секции через `z-index: 1`

Почему это полезно:

- волны не перехватывают клики из-за `pointer-events: none`
- контент всегда остаётся над фоном
- `isolation: isolate` не даёт неожиданно смешиваться стековым контекстам

## Минимальный набор для переноса 1 в 1

Если нужно повторить эффект в другом проекте максимально близко, надо перенести без изменений:

1. `@keyframes sectionGlowDrift`
2. `@keyframes sectionWaveDrift`
3. общую механику `.section-dark` / `.section-light`
4. `::before` и `::after` для обеих тем
5. оба встроенных SVG в `data:image/svg+xml`
6. `prefers-reduced-motion` блок
7. отдельно hero-слои с изображением и двумя overlay

## Что нельзя упрощать, если нужен тот же визуальный результат

- нельзя заменять SVG-волны на одну волну
- нельзя убирать `inset: -4%` у `::after`
- нельзя делать анимацию быстрее, иначе фон станет раздражающим
- нельзя заменять тонкие `stroke-opacity` на непрозрачные линии
- нельзя объединять glow и wave в один слой, иначе потеряется глубина
- нельзя убирать `overflow-x: hidden` у `body`, иначе могут появиться боковые артефакты

## Практический prompt для Gemini 3.1 Pro

Ниже промпт, который можно дать Gemini для переноса подхода в другой проект.

```text
Нужно воспроизвести фоновые волны и фон в стиле B.A. Holding максимально близко к оригиналу, без упрощений.

Требования:
- Сделай два переиспользуемых CSS-класса: section-dark и section-light.
- Каждый класс должен быть position: relative и isolation: isolate.
- Волны реализуй через ::after с background-image на основе data:image/svg+xml.
- Glow и мягкую подложку реализуй через ::before с несколькими radial-gradient плюс линейный gradient.
- Все дочерние элементы секции должны быть поверх через z-index: 1.
- Для glow используй отдельную медленную анимацию background-position.
- Для wave-слоя используй отдельную медленную анимацию transform: translate3d(...) scale(...).
- У wave-слоя сделай inset: -4%, background-size: cover, opacity около 0.95.
- Обязательно поддержи prefers-reduced-motion: reduce и отключай анимацию.
- Сохрани премиальный корпоративный стиль: глубокий тёмно-синий, мягкие синие свечения, тонкие полупрозрачные волнистые линии, спокойная анимация.
- Для hero-секции не используй тот же механизм: сделай отдельный fullscreen hero с background image, сверху radial-gradient overlay и ещё один тёмный overlay для читаемости текста.

Используй такие же или максимально близкие параметры:
- wave SVG size: 1600x900
- 4 separate paths
- stroke-width: 2
- low stroke opacity
- slow animation around 26s-34s
- transform drift with subtle scale around 1.03-1.045

Если переносишь в React / Next.js / plain HTML, сохрани саму визуальную механику, даже если синтаксис классов будет отличаться.
```

## Короткий вывод

В проекте эффект строится не на одной картинке и не на одном SVG. Это многослойная система:

- базовый фон сайта
- glow-подложка для секции
- отдельный SVG-слой волн
- независимая плавная анимация
- отдельный hero с картинкой и overlay

Если переносить это в другой проект, лучше переносить механику целиком, а не собирать по памяти отдельные куски.
