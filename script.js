(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Render feather icons */
  if (window.feather) {
    feather.replace();
  }

  /* ---- Preloader: fills the bar while the page loads, then lifts like a curtain ---- */
  var preloader = document.getElementById("preloader");
  var preloaderBar = document.getElementById("preloaderBar");
  var root = document.documentElement;

  function finishLoading() {
    root.classList.remove("is-loading");
    if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader);
  }

  if (preloader) {
    var progress = 0;
    var MIN_SHOW = reduceMotion ? 0 : 900;
    var progressTimer = setInterval(function () {
      progress += (90 - progress) * 0.12;
      if (preloaderBar) preloaderBar.style.width = progress.toFixed(1) + "%";
    }, 90);
    var hidden = false;
    var hidePreloader = function () {
      if (hidden) return;
      hidden = true;
      clearInterval(progressTimer);
      if (preloaderBar) preloaderBar.style.width = "100%";
      var wait = Math.max(0, MIN_SHOW - performance.now());
      setTimeout(function () {
        if (reduceMotion) { finishLoading(); return; }
        preloader.classList.add("done");
        /* let the page animations start as the curtain begins to rise */
        setTimeout(function () { root.classList.remove("is-loading"); }, 280);
        setTimeout(finishLoading, 1000);
      }, wait + 180);
    };
    if (document.readyState === "complete") hidePreloader();
    else window.addEventListener("load", hidePreloader);
    setTimeout(hidePreloader, 5000); /* never block the page for long on a slow connection */
  } else {
    root.classList.remove("is-loading");
  }

  /* ---- Hero title: split into words for a staggered rise ---- */
  var heroTitle = document.querySelector(".hero-title");
  if (heroTitle && !reduceMotion) {
    /* Keep any fixed line breaks (.hero-line) and animate word by word inside them */
    var lineEls = heroTitle.querySelectorAll(".hero-line");
    var lines = lineEls.length
      ? Array.prototype.map.call(lineEls, function (el) { return el.textContent.trim(); })
      : [heroTitle.textContent.trim()];
    heroTitle.setAttribute("aria-label", lines.join(" "));
    heroTitle.textContent = "";
    var wordIndex = 0;
    lines.forEach(function (line, li) {
      var lineWrap = heroTitle;
      if (lineEls.length) {
        lineWrap = document.createElement("span");
        lineWrap.className = "hero-line";
        lineWrap.setAttribute("aria-hidden", "true");
        heroTitle.appendChild(lineWrap);
      }
      var words = line.split(/\s+/);
      words.forEach(function (word, i) {
        var outer = document.createElement("span");
        var inner = document.createElement("span");
        outer.className = "word";
        outer.setAttribute("aria-hidden", "true");
        inner.textContent = word;
        inner.style.setProperty("--d", (0.2 + wordIndex * 0.045).toFixed(3) + "s");
        wordIndex++;
        outer.appendChild(inner);
        lineWrap.appendChild(outer);
        if (i < words.length - 1) lineWrap.appendChild(document.createTextNode(" "));
      });
      if (lineEls.length && li < lines.length - 1) heroTitle.appendChild(document.createTextNode(" "));
    });
  }

  /* ---- Header: always visible; turns solid once you scroll or open the mega menu ---- */
  var header = document.getElementById("siteHeader");
  var toTop = document.getElementById("toTop");
  var mainNav = document.getElementById("main-nav");
  var mobileBar = document.getElementById("mobileBar");

  function onScrollHeader() {
    var y = window.scrollY;
    var megaOpen = !!document.querySelector(".has-mega.open");
    header.classList.toggle("scrolled", y > 24 || (megaOpen && window.matchMedia("(min-width: 861px)").matches));
    if (toTop) toTop.classList.toggle("show", y > 700);
    if (mobileBar) mobileBar.classList.toggle("show", y > 480);
  }

  /* ---- Parallax on hero and banner images ---- */
  var heroBg = document.querySelector(".hero-bg");
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));

  function onScrollParallax() {
    if (reduceMotion) return;
    var y = window.scrollY;
    var vh = window.innerHeight;
    if (heroBg && y < vh * 1.2) {
      heroBg.style.transform = "translate3d(0," + (y * 0.3).toFixed(1) + "px,0)";
    }
    parallaxEls.forEach(function (el) {
      var rect = el.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      var progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      el.style.transform = "translate3d(0," + (progress * -80).toFixed(1) + "px,0)";
    });
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollHeader();
      onScrollParallax();
      ticking = false;
    });
  }, { passive: true });
  onScrollHeader();
  onScrollParallax();

  /* ---- Hero photo slider ---- */
  var slides = Array.prototype.slice.call(document.querySelectorAll(".hero-slide"));
  var slidePanel = document.querySelector(".slide-panel");

  if (slides.length > 1 && slidePanel) {
    var SLIDE_MS = 6000;
    var current = 0;
    var timer = null;
    var startedAt = 0;
    var remaining = SLIDE_MS;
    var slideInfo = document.getElementById("slideInfo");
    var slideIcon = document.getElementById("slideIcon");
    var slideLabel = document.getElementById("slideLabel");
    var slideCaption = document.getElementById("slideCaption");
    var slideNum = document.getElementById("slideNum");
    var dotsWrap = document.getElementById("slideDots");
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };

    slidePanel.style.setProperty("--slide-ms", SLIDE_MS + "ms");
    document.getElementById("slideTotal").textContent = pad(slides.length);

    var dots = slides.map(function (slide, i) {
      var dot = document.createElement("button");
      dot.className = "slide-dot";
      dot.setAttribute("aria-label", "Show photo " + (i + 1) + ": " + slide.dataset.label);
      dot.addEventListener("click", function () { goTo(i); });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function renderDots() {
      dots.forEach(function (dot, i) {
        dot.classList.remove("active");
        dot.classList.toggle("done", i < current || (reduceMotion && i === current));
        dot.setAttribute("aria-current", i === current ? "true" : "false");
      });
      void dotsWrap.offsetWidth;
      if (!reduceMotion) dots[current].classList.add("active");
    }

    function renderCaption() {
      var slide = slides[current];
      slideLabel.textContent = slide.dataset.label;
      slideCaption.textContent = slide.dataset.caption;
      slideNum.textContent = pad(current + 1);
      if (window.feather && feather.icons[slide.dataset.icon]) {
        slideIcon.innerHTML = feather.icons[slide.dataset.icon].toSvg();
      }
      slideInfo.classList.remove("swap");
      void slideInfo.offsetWidth;
      slideInfo.classList.add("swap");
    }

    function schedule(ms) {
      clearTimeout(timer);
      if (reduceMotion) return;
      remaining = ms;
      startedAt = performance.now();
      timer = setTimeout(function () { goTo(current + 1); }, ms);
    }

    function goTo(n) {
      n = (n + slides.length) % slides.length;
      if (n === current) return;
      var prev = slides[current];
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
      setTimeout(function () { prev.classList.remove("is-leaving"); }, 1150);
      current = n;
      slides[current].classList.add("is-active");
      renderCaption();
      renderDots();
      slidePanel.classList.remove("paused");
      schedule(SLIDE_MS);
    }

    function pause() {
      if (reduceMotion || slidePanel.classList.contains("paused")) return;
      clearTimeout(timer);
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
      slidePanel.classList.add("paused");
    }

    function resume() {
      if (reduceMotion || !slidePanel.classList.contains("paused")) return;
      slidePanel.classList.remove("paused");
      schedule(remaining);
    }

    document.getElementById("slidePrev").addEventListener("click", function () { goTo(current - 1); });
    document.getElementById("slideNext").addEventListener("click", function () { goTo(current + 1); });
    slidePanel.addEventListener("mouseenter", pause);
    slidePanel.addEventListener("mouseleave", resume);
    slidePanel.addEventListener("focusin", pause);
    slidePanel.addEventListener("focusout", resume);
    slidePanel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") goTo(current - 1);
      if (e.key === "ArrowRight") goTo(current + 1);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause(); else resume();
    });

    /* Swipe between photos on touch screens */
    var hero = document.querySelector(".hero");
    var touchX = null;
    hero.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });

    renderDots();
    schedule(SLIDE_MS);
  }

  /* ---- Mobile navigation toggle ---- */
  var menuToggle = document.getElementById("menuToggle");

  function setMenu(open) {
    if (!open) setMega(false);
    mainNav.classList.toggle("open", open);
    header.classList.toggle("menu-open", open);
    document.documentElement.classList.toggle("nav-open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      setMenu(!mainNav.classList.contains("open"));
    });
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---- About mega menu: hover or click on desktop, accordion on mobile ---- */
  var megaItem = document.querySelector(".has-mega");
  var megaToggle = megaItem ? megaItem.querySelector(".mega-toggle") : null;
  var megaCloseTimer = null;
  var isDesktop = function () { return window.matchMedia("(min-width: 861px)").matches; };

  function setMega(open) {
    if (!megaItem) return;
    clearTimeout(megaCloseTimer);
    megaItem.classList.toggle("open", open);
    header.classList.toggle("mega-open", open && isDesktop());
    megaToggle.setAttribute("aria-expanded", open ? "true" : "false");
    megaToggle.setAttribute("aria-label", open ? "Hide About menu" : "Show About menu");
    onScrollHeader();
  }

  if (megaItem && megaToggle) {
    megaToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setMega(!megaItem.classList.contains("open"));
    });
    megaItem.addEventListener("mouseenter", function () {
      if (isDesktop()) setMega(true);
    });
    megaItem.addEventListener("mouseleave", function () {
      if (!isDesktop()) return;
      clearTimeout(megaCloseTimer);
      megaCloseTimer = setTimeout(function () { setMega(false); }, 160);
    });
    megaItem.addEventListener("focusout", function (e) {
      if (isDesktop() && !megaItem.contains(e.relatedTarget)) setMega(false);
    });
    document.addEventListener("click", function (e) {
      if (isDesktop() && !megaItem.contains(e.target)) setMega(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && megaItem.classList.contains("open")) {
        setMega(false);
        megaToggle.focus();
      }
    });
  }

  /* ---- Mobile: turn long card grids into swipeable rows with dots ---- */
  var carouselQuery = window.matchMedia("(max-width: 760px)");
  var carouselTracks = Array.prototype.slice.call(document.querySelectorAll(
    ".services-grid, .values-grid, .steps-grid, .flow-grid, .org-grid, .journey"
  ));

  carouselTracks.forEach(function (track) {
    var items = Array.prototype.slice.call(track.children);
    if (items.length < 2) return;
    var dots = document.createElement("div");
    dots.className = "m-dots";
    var buttons = items.map(function (item, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show card " + (i + 1) + " of " + items.length);
      b.addEventListener("click", function () {
        track.scrollTo({ left: item.offsetLeft - items[0].offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
      });
      dots.appendChild(b);
      return b;
    });
    track.parentNode.insertBefore(dots, track.nextSibling);

    var raf = null;
    function updateDots() {
      raf = null;
      var step = items[1].offsetLeft - items[0].offsetLeft || 1;
      var idx = Math.min(items.length - 1, Math.round(track.scrollLeft / step));
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) idx = items.length - 1;
      buttons.forEach(function (b, i) { b.classList.toggle("active", i === idx); });
    }
    track.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(updateDots); }, { passive: true });

    function applyMode() {
      track.classList.toggle("m-carousel", carouselQuery.matches);
      updateDots();
    }
    applyMode();
    if (carouselQuery.addEventListener) carouselQuery.addEventListener("change", applyMode);
  });

  /* ---- Scroll reveal (with staggered children) ---- */
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.classList.add("reveal");
      child.style.setProperty("--d", (i * 0.07).toFixed(2) + "s");
    });
  });

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("in");
        revealObserver.unobserve(el);
        /* Once shown, drop the reveal classes so the card's own hover transitions take over */
        setTimeout(function () {
          el.classList.remove("reveal", "reveal-zoom", "in");
          el.style.removeProperty("--d");
        }, 1500);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Active nav link for the section in view ---- */
  /* Top-level links that point to a section on this same page, e.g. index.html#services */
  var navLinks = mainNav ? Array.prototype.filter.call(
    mainNav.querySelectorAll(":scope > ul > li > a[href*='#']"),
    function (a) {
      var samePage = function (path) { return path.replace(/index\.html$/, ""); };
      return a.hash && samePage(a.pathname) === samePage(window.location.pathname);
    }
  ) : [];
  if ("IntersectionObserver" in window && navLinks.length) {
    var linkFor = {};
    navLinks.forEach(function (a) { linkFor[a.hash.slice(1)] = a; });
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var link = linkFor[entry.target.id];
        navLinks.forEach(function (a) { a.classList.toggle("active", a === link); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) {
      sectionObserver.observe(s);
    });
  }

  /* Hand hero items back to normal styles once their entrance finishes */
  document.querySelectorAll(".hero-anim").forEach(function (el) {
    el.addEventListener("animationend", function () { el.classList.remove("hero-anim"); });
  });

  /* ---- FAQ: smooth open / close ---- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var summary = item.querySelector("summary");
    var body = item.querySelector(".faq-body");
    var anim = null;
    if (item.open) item.classList.add("is-open");

    summary.addEventListener("click", function (e) {
      if (reduceMotion || !body.animate) {
        requestAnimationFrame(function () { item.classList.toggle("is-open", item.open); });
        return;
      }
      e.preventDefault();
      if (anim) anim.cancel();

      if (item.open && item.classList.contains("is-open")) {
        item.classList.remove("is-open");
        anim = body.animate(
          [{ height: body.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
          { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
        anim.onfinish = function () { item.open = false; anim = null; };
      } else {
        item.open = true;
        item.classList.add("is-open");
        anim = body.animate(
          [{ height: "0px", opacity: 0 }, { height: body.offsetHeight + "px", opacity: 1 }],
          { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
        anim.onfinish = function () { anim = null; };
      }
    });
  });

  /* ---- UGX currency formatting + animated numbers ---- */
  function formatUGX(amount) {
    var rounded = Math.max(0, Math.round(amount));
    return "UGX " + rounded.toLocaleString("en-UG");
  }

  function setAmount(el, value) {
    var from = parseFloat(el.dataset.value || "0");
    el.dataset.value = value;
    if (reduceMotion || from === value) {
      el.textContent = formatUGX(value);
      return;
    }
    var start = performance.now();
    var duration = 450;
    if (el._raf) cancelAnimationFrame(el._raf);
    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatUGX(from + (value - from) * eased);
      if (t < 1) el._raf = requestAnimationFrame(step);
    }
    el._raf = requestAnimationFrame(step);
    var card = el.parentElement;
    card.classList.remove("bump");
    void card.offsetWidth;
    card.classList.add("bump");
  }

  /* ---- Loan calculator (reducing balance, monthly compounding) ---- */
  var loanAmount = document.getElementById("loanAmount");
  var loanRate = document.getElementById("loanRate");
  var loanTerm = document.getElementById("loanTerm");
  var loanMonthlyOut = document.getElementById("loanMonthly");
  var loanTotalOut = document.getElementById("loanTotal");
  var loanInterestOut = document.getElementById("loanInterest");

  function calcLoan() {
    var principal = parseFloat(loanAmount.value) || 0;
    var annualRate = parseFloat(loanRate.value) || 0;
    var months = parseInt(loanTerm.value, 10) || 0;

    if (principal <= 0 || months <= 0) {
      setAmount(loanMonthlyOut, 0);
      setAmount(loanTotalOut, 0);
      setAmount(loanInterestOut, 0);
      return;
    }

    var monthlyRate = annualRate / 100 / 12;
    var monthlyPayment;

    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      var factor = Math.pow(1 + monthlyRate, months);
      monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);
    }

    var totalRepaid = monthlyPayment * months;
    var totalInterest = totalRepaid - principal;

    setAmount(loanMonthlyOut, monthlyPayment);
    setAmount(loanTotalOut, totalRepaid);
    setAmount(loanInterestOut, totalInterest);
  }

  [loanAmount, loanRate, loanTerm].forEach(function (input) {
    if (input) input.addEventListener("input", calcLoan);
  });

  /* ---- Savings calculator (monthly deposits + monthly compounding) ---- */
  var saveOpening = document.getElementById("saveOpening");
  var saveMonthly = document.getElementById("saveMonthly");
  var saveRate = document.getElementById("saveRate");
  var saveTerm = document.getElementById("saveTerm");
  var saveContribOut = document.getElementById("saveContrib");
  var saveInterestOut = document.getElementById("saveInterest");
  var saveTotalOut = document.getElementById("saveTotal");

  function calcSavings() {
    var opening = parseFloat(saveOpening.value) || 0;
    var monthlyDeposit = parseFloat(saveMonthly.value) || 0;
    var annualRate = parseFloat(saveRate.value) || 0;
    var months = parseInt(saveTerm.value, 10) || 0;

    if (months <= 0) {
      setAmount(saveContribOut, 0);
      setAmount(saveInterestOut, 0);
      setAmount(saveTotalOut, 0);
      return;
    }

    var monthlyRate = annualRate / 100 / 12;
    var balance = opening;

    for (var i = 0; i < months; i++) {
      balance = balance * (1 + monthlyRate) + monthlyDeposit;
    }

    var totalContributed = opening + monthlyDeposit * months;
    var interestEarned = balance - totalContributed;

    setAmount(saveContribOut, totalContributed);
    setAmount(saveInterestOut, Math.max(0, interestEarned));
    setAmount(saveTotalOut, balance);
  }

  [saveOpening, saveMonthly, saveRate, saveTerm].forEach(function (input) {
    if (input) input.addEventListener("input", calcSavings);
  });

  /* ---- Calculator tabs ---- */
  var tabLoan = document.getElementById("tab-loan");
  var tabSavings = document.getElementById("tab-savings");
  var panelLoan = document.getElementById("panel-loan");
  var panelSavings = document.getElementById("panel-savings");
  var calcTabs = document.querySelector(".calc-tabs");

  function showTab(target) {
    var loanActive = target === "loan";
    if (loanActive === !panelLoan.hidden) return;
    tabLoan.classList.toggle("active", loanActive);
    tabSavings.classList.toggle("active", !loanActive);
    tabLoan.setAttribute("aria-selected", loanActive ? "true" : "false");
    tabSavings.setAttribute("aria-selected", loanActive ? "false" : "true");
    calcTabs.classList.toggle("savings", !loanActive);
    panelLoan.hidden = !loanActive;
    panelSavings.hidden = loanActive;
    var shown = loanActive ? panelLoan : panelSavings;
    shown.classList.remove("entering");
    void shown.offsetWidth;
    shown.classList.add("entering");
  }

  if (tabLoan && tabSavings) {
    tabLoan.addEventListener("click", function () { showTab("loan"); });
    tabSavings.addEventListener("click", function () { showTab("savings"); });
  }

  /* Count up the calculator figures the first time they come into view */
  var calcCard = document.querySelector(".calc-card");
  if ("IntersectionObserver" in window && calcCard && !reduceMotion) {
    var calcObserver = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      calcObserver.disconnect();
      calcLoan();
      calcSavings();
    }, { threshold: 0.3 });
    calcObserver.observe(calcCard);
  } else if (calcCard) {
    calcLoan();
    calcSavings();
  }

  /* ---- Footer: year and live "open now" status (Mbarara time, EAT) ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var openStatus = document.getElementById("openStatus");
  function updateOpenStatus() {
    if (!openStatus || !window.Intl) return;
    var parts = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Kampala", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var mins = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
    var day = parts.weekday;
    var open = false;
    if (["Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(day) !== -1) open = mins >= 510 && mins < 1020;
    else if (day === "Sat") open = mins >= 540 && mins < 780;
    openStatus.textContent = open ? "Open now" : "Closed now";
    openStatus.className = "open-status " + (open ? "is-open" : "is-closed");
    openStatus.hidden = false;
  }
  try { updateOpenStatus(); setInterval(updateOpenStatus, 60000); } catch (err) { /* older browsers: leave hidden */ }

  /* ---- SMS updates form (client-side demo) ---- */
  var updatesForm = document.getElementById("updatesForm");
  var updatesStatus = document.getElementById("updatesStatus");
  if (updatesForm) {
    updatesForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var phone = document.getElementById("updatesPhone").value.replace(/[\s-]/g, "");
      updatesStatus.className = "updates-status";
      void updatesStatus.offsetWidth;
      if (!/^(\+?256|0)7\d{8}$/.test(phone)) {
        updatesStatus.textContent = "Please enter a valid Ugandan mobile number, e.g. 0772 123 456.";
        updatesStatus.className = "updates-status error";
        return;
      }
      updatesStatus.textContent = "Thank you! You will receive SACCO updates by SMS.";
      updatesStatus.className = "updates-status success";
      updatesForm.reset();
    });
  }

  /* ---- Enquiry form (client-side demo submission) ---- */
  var enquiryForm = document.getElementById("enquiryForm");
  var formStatus = document.getElementById("formStatus");

  if (enquiryForm) {
    enquiryForm.addEventListener("submit", function (event) {
      event.preventDefault();
      formStatus.className = "form-status";
      void formStatus.offsetWidth;

      if (!enquiryForm.checkValidity()) {
        formStatus.textContent = "Please fill in your name, phone number and message.";
        formStatus.className = "form-status error";
        return;
      }

      var name = document.getElementById("fName").value.trim();
      formStatus.textContent = "Thank you, " + name + "! Your enquiry has been noted. Our office will contact you soon.";
      formStatus.className = "form-status success";
      enquiryForm.reset();
    });
  }
})();
