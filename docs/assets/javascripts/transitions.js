/*
 * Stoneland Wiki — плавные переходы между страницами.
 *
 * У MkDocs Material включена "мгновенная навигация" (navigation.instant):
 * при клике по внутренней ссылке страница не перезагружается, а контент
 * подменяется через фоновый запрос — быстро и без белого экрана.
 *
 * Побочный эффект: при подмене HTML старое левое меню удаляется, а новое
 * вставляется уже "рождённым" сразу в нужной позиции прокрутки. Причём
 * сама эта позиция выставляется не сразу в момент вставки в DOM, а чуть
 * позже — при подготовке следующего кадра отрисовки. Поэтому её нельзя
 * поймать ни событием scroll (оно не происходит — элемент не "доскролливается",
 * а рождается сразу такимкаким нужно), ни обычным MutationObserver
 * (в момент вставки значение ещё не выставлено). Значение нужно читать
 * из requestAnimationFrame — там оно уже финальное, но кадр ещё не
 * отрисован, то есть можно подменить незаметно для глаза.
 *
 * Вместо борьбы за scrollTop используется визуальный трюк: реальному
 * скроллу разрешается прыгнуть мгновенно (это не видно пользователю, раз
 * подменяется до отрисовки), а поверх него сразу накладывается
 * компенсирующий CSS-сдвиг (transform: translateY), который зрительно
 * "откатывает" контент туда, где он был на предыдущей странице. Затем
 * этот сдвиг плавно анимируется обратно к нулю — визуально это выглядит
 * как плавная прокрутка.
 */
(function () {
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var lastKnownTop = 0;

  // Запоминаем прокрутку сайдбара, пока пользователь листает его сам.
  document.addEventListener(
    "scroll",
    function (event) {
      var el = event.target;
      if (
        el &&
        el.classList &&
        el.classList.contains("md-sidebar__scrollwrap") &&
        el.closest(".md-sidebar--primary")
      ) {
        lastKnownTop = el.scrollTop;
      }
    },
    true
  );

  if (typeof MutationObserver === "undefined") {
    return;
  }

  function findScrollwrap(node) {
    if (node.nodeType !== 1) {
      return null;
    }
    var sidebar = node.matches(".md-sidebar--primary")
      ? node
      : node.querySelector
      ? node.querySelector(".md-sidebar--primary")
      : null;
    return sidebar ? sidebar.querySelector(".md-sidebar__scrollwrap") : null;
  }

  var handled = typeof WeakSet !== "undefined" ? new WeakSet() : null;

  function handleNewScrollwrap(scrollwrap) {
    if (handled) {
      if (handled.has(scrollwrap)) {
        return;
      }
      handled.add(scrollwrap);
    }

    requestAnimationFrame(function () {
      var nativeTop = scrollwrap.scrollTop;
      var delta = nativeTop - lastKnownTop;
      lastKnownTop = nativeTop;

      if (reduceMotion || Math.abs(delta) < 1) {
        return;
      }

      var inner = scrollwrap.querySelector(".md-sidebar__inner");
      if (!inner) {
        return;
      }

      inner.style.transition = "none";
      inner.style.transform = "translateY(" + delta + "px)";
      // Форсируем применение стиля до того, как поставим transition,
      // иначе браузер попробует анимировать и сам "откат".
      void inner.offsetHeight;
      requestAnimationFrame(function () {
        inner.style.transition =
          "transform 450ms cubic-bezier(0.4, 0, 0.2, 1)";
        inner.style.transform = "translateY(0)";
        setTimeout(function () {
          inner.style.transition = "";
          inner.style.transform = "";
        }, 500);
      });
    });
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var scrollwrap = findScrollwrap(added[j]);
        if (scrollwrap) {
          handleNewScrollwrap(scrollwrap);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
