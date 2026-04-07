const stage = document.querySelector("[data-home-stage]");

if (stage) {
  const toggle = stage.querySelector("[data-home-toggle]");
  const letter = stage.querySelector("[data-home-letter]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const openHash = "#letter-to-visitors";
  let isOpen = false;
  let hideTimer = null;

  const setA11y = (expanded) => {
    toggle.setAttribute("aria-expanded", String(expanded));
    letter.setAttribute("aria-hidden", String(!expanded));
  };

  const syncHash = (expanded) => {
    const url = new URL(window.location.href);
    url.hash = expanded ? openHash.slice(1) : "";
    window.history.replaceState({}, "", url);
  };

  const animateLockup = (firstBox) => {
    if (reducedMotion) {
      return;
    }

    const lastBox = toggle.getBoundingClientRect();
    const dx = firstBox.left - lastBox.left;
    const dy = firstBox.top - lastBox.top;
    const sx = firstBox.width / Math.max(lastBox.width, 1);
    const sy = firstBox.height / Math.max(lastBox.height, 1);

    toggle.animate(
      [
        {
          transformOrigin: "top left",
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        },
        {
          transformOrigin: "top left",
          transform: "translate(0, 0) scale(1, 1)",
        },
      ],
      {
        duration: 760,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  };

  const setOpenState = (nextOpen, { immediate = false } = {}) => {
    if (nextOpen === isOpen && !immediate) {
      return;
    }

    window.clearTimeout(hideTimer);

    const firstBox = immediate ? null : toggle.getBoundingClientRect();

    if (nextOpen) {
      letter.hidden = false;
      letter.getBoundingClientRect();
    }

    stage.classList.toggle("is-letter-open", nextOpen);
    setA11y(nextOpen);
    isOpen = nextOpen;
    syncHash(nextOpen);

    if (firstBox) {
      requestAnimationFrame(() => animateLockup(firstBox));
    }

    if (!nextOpen) {
      if (immediate || reducedMotion) {
        letter.hidden = true;
      } else {
        hideTimer = window.setTimeout(() => {
          if (!isOpen) {
            letter.hidden = true;
          }
        }, 520);
      }
    }
  };

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    setOpenState(!isOpen);
  });

  toggle.addEventListener("keydown", (event) => {
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      setOpenState(!isOpen);
    }
  });

  window.addEventListener("hashchange", () => {
    setOpenState(window.location.hash === openHash, { immediate: true });
  });

  setOpenState(window.location.hash === openHash, { immediate: true });
}
