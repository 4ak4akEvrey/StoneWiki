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

// ── Ctrl+K / Cmd+K открывает поиск, как в GitBook ──
document.addEventListener("keydown", function (e) {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k" && e.code !== "KeyK") {
    return;
  }
  var toggle = document.querySelector('[data-md-toggle="search"]');
  var input = document.querySelector(".md-search__input");
  if (!toggle || !input) {
    return;
  }
  e.preventDefault();
  if (!toggle.checked) {
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
  }
  setTimeout(function () { input.focus(); }, 0);
});

// ── Вкладки в шапке ──
// При мгновенной навигации шапка не перерисовывается, а скрытая полоса .md-tabs —
// да. Берём из неё активную вкладку и правильные ссылки для текущей страницы.
function syncTabs() {
  var src = document.querySelectorAll(".md-tabs .md-tabs__item");
  var dst = document.querySelectorAll(".sl-tabs .md-tabs__item");
  for (var i = 0; i < src.length && i < dst.length; i++) {
    dst[i].classList.toggle("md-tabs__item--active", src[i].classList.contains("md-tabs__item--active"));
    var a = src[i].querySelector("a"), b = dst[i].querySelector("a");
    if (a && b) {
      b.setAttribute("href", a.getAttribute("href"));
    }
  }
}

if (typeof document$ !== "undefined") {
  document$.subscribe(syncTabs);
} else {
  document.addEventListener("DOMContentLoaded", syncTabs);
}

// ── Кнопка «Копировать ссылку» и всплывашка ──
document.addEventListener("click", function (e) {
  var btn = e.target.closest && e.target.closest("[data-sl-copy]");
  if (!btn) {
    return;
  }
  var url = location.href.split("#")[0];
  var done = function () {
    var t = document.querySelector(".sl-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "sl-toast";
      document.body.appendChild(t);
    }
    t.textContent = "Ссылка скопирована";
    t.classList.add("sl-toast--show");
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("sl-toast--show"); }, 1600);
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(done);
  } else {
    var a = document.createElement("textarea");
    a.value = url;
    document.body.appendChild(a);
    a.select();
    document.execCommand("copy");
    a.remove();
    done();
  }
});
