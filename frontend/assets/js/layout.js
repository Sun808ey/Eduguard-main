// Optional layout JS: mobile sidebar/drawer toggle
// This script is safe to include; it only activates if expected DOM elements exist.
(function(){
  function qs(sel){return document.querySelector(sel)}
  const toggle = qs('.mobile-nav-toggle')
  const sidebar = qs('.sidebar')
  const drawer = qs('.mobile-drawer')

  if(!toggle) return

  toggle.addEventListener('click', function(e){
    // If a mobile-drawer exists, toggle it, otherwise toggle sidebar class
    if(drawer){
      drawer.classList.toggle('open')
      document.body.classList.toggle('no-scroll', drawer.classList.contains('open'))
    } else if(sidebar){
      sidebar.classList.toggle('sidebar--open')
      const expanded = sidebar.classList.contains('sidebar--open')
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false')
    }
  })

  // Close when clicking overlay
  if(drawer){
    drawer.addEventListener('click', function(e){
      if(e.target === drawer) drawer.classList.remove('open')
    })
  }
})();
