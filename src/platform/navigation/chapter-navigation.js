(function installChapterNavigation(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  const chapterDefinitions = Object.freeze([
    { chapterId: "ch01", title: "第一章", subtitle: "常用低压电器", expanded: false },
    { chapterId: "ch02", title: "第二章", subtitle: "电器控制系统", expanded: true },
    { chapterId: "ch03", title: "第三章", subtitle: "基本环节", expanded: false },
    { chapterId: "ch04", title: "第四章", subtitle: "典型控制线路分析", expanded: false },
    { chapterId: "ch05", title: "第五章", subtitle: "电器控制系统设计", expanded: false }
  ]);

  function mountChapterNavigation(options) {
    const { container, registry, activeRouteId, onSelect } = options;
    const expandedChapters = new Set(
      chapterDefinitions.filter((chapter) => chapter.expanded).map((chapter) => chapter.chapterId)
    );

    function render(currentRouteId = activeRouteId) {
      container.replaceChildren();
      chapterDefinitions.forEach((chapter) => {
        const section = document.createElement("section");
        section.className = "platform-chapter";
        section.dataset.chapterId = chapter.chapterId;

        const header = document.createElement("button");
        header.type = "button";
        header.className = "platform-chapter-toggle";
        header.setAttribute("aria-expanded", String(expandedChapters.has(chapter.chapterId)));
        header.innerHTML = `
          <span class="platform-chapter-arrow" aria-hidden="true">›</span>
          <span class="platform-chapter-copy">
            <strong>${chapter.title}</strong>
            <span>${chapter.subtitle}</span>
          </span>
          <span class="platform-chapter-chevron" aria-hidden="true">⌄</span>
        `;
        header.addEventListener("click", () => {
          if (expandedChapters.has(chapter.chapterId)) {
            expandedChapters.delete(chapter.chapterId);
          } else {
            expandedChapters.add(chapter.chapterId);
          }
          render(currentRouteId);
        });
        section.appendChild(header);

        const moduleList = document.createElement("nav");
        moduleList.className = "module-nav platform-module-list";
        moduleList.hidden = !expandedChapters.has(chapter.chapterId);
        moduleList.setAttribute("aria-label", `${chapter.title}${chapter.subtitle}`);
        registry.listByChapter(chapter.chapterId).forEach((definition) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "module-nav-item";
          button.dataset.module = definition.meta.routeId;
          button.classList.toggle("active", definition.meta.routeId === currentRouteId);

          const number = document.createElement("span");
          number.className = "num";
          number.textContent = definition.meta.code;
          const label = document.createElement("span");
          label.className = "label";
          label.textContent = definition.meta.shortTitle;
          button.append(number, label);
          button.addEventListener("click", () => onSelect(definition.meta.routeId));
          moduleList.appendChild(button);
        });
        section.appendChild(moduleList);
        container.appendChild(section);
      });
    }

    function updateActive(routeId) {
      container.querySelectorAll(".module-nav-item").forEach((button) => {
        button.classList.toggle("active", button.dataset.module === routeId);
      });
    }

    render(activeRouteId);
    return Object.freeze({
      render,
      updateActive,
      getModuleButtons: () => Array.from(container.querySelectorAll(".module-nav-item"))
    });
  }

  platform.navigation = Object.freeze({ chapterDefinitions, mountChapterNavigation });
})(globalThis);
