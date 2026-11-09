/** Two optional editor sidebars. Does not touch Three.js or Zod state. */
export function wirePanelToggles(root) {
    const body = root.body;
    if (!body)
        throw new Error('Editor layout needs a document body');
    const pairs = [
        ['toggle-scenes', 'scenes-collapsed'],
        ['toggle-inspector', 'inspector-collapsed'],
    ];
    for (const [id, className] of pairs) {
        const button = root.getElementById(id);
        if (!button)
            throw new Error(`Missing layout toggle ${id}`);
        button.addEventListener('click', () => {
            const isCollapsed = body.classList.toggle(className);
            button.setAttribute('aria-expanded', String(!isCollapsed));
        });
    }
}
