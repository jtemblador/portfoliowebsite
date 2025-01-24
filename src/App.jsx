import React from 'react';

// Theme Toggle Button Component
const ThemeToggle = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="fixed top-6 right-6 z-50 p-2 rounded-full transition-colors duration-200"
      style={{
        backgroundColor: isDark ? '#112240' : '#79583E',
        border: `2px solid ${isDark ? '#4a5568' : '#79583E'}`
      }}
    >
      {isDark ? (
        // Sun icon for dark mode
        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        // Moon icon for light mode
        <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

// Left Sidebar Component (Fixed)
const Sidebar = ({activeSection, isDark}) => {
  return (
    <div className={`fixed w-[735px] h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#11224a]' : 'bg-[#79583E]'
    }`}>
      {/* Start of About Me Section */}
      <div className="max-w-[1600px] mx-auto px-32 h-full flex flex-col justify-between">
        <div className="flex flex-col">
        <h1 className={`text-6xl font-bold mb-8 mt-28 cursor-pointer select-none ${
          isDark ? 'text-white' : 'text-[#ffe1a6]'
        }`}>Jose Temblador</h1>
        <h2 className={`text-xl mb-6 ${
          isDark ? 'text-white' : 'text-[#ffe1a6]'
        }`}>Front End Engineer</h2>
        <p className={`mb-12 max-w-xs ${
          isDark ? 'text-gray-400' : 'text-[#ffd787]'
        }`}>
          I build accessible, pixel-perfect digital experiences for the web.
        </p>
          
          {/* Navigation Links */}
          <nav className="space-y-3">
            <a
              href="#about"
              className={`font-bold block transition-all ${
                activeSection === 'about'
                ? isDark 
                  // Dark Mode (Highlighed text)
                  ? 'text-green-400 animate-glow-dark' 
                  // Light Mode (Highlighed text)
                  : 'text-[#ff0000] animate-glow-light'
                : isDark 
                  // Dark Mode (Un-Highlighed text)
                  ? 'text-gray-400 hover:text-white'
                  // Light Mode (Un-Highlighed text)
                  : 'text-[#e10000] hover:text-[#ffd787]'
              }`}
            >
              About Me
            </a>
            <a
              href="#experience"
              className={`font-bold block transition-all ${
                activeSection === 'experience'
                ? isDark 
                  // Dark Mode (Highlighed text)
                  ? 'text-green-400 animate-glow-dark' 
                  // Light Mode (Highlighed text)
                  : 'text-[#ff0000] animate-glow-light'
                : isDark 
                  // Dark Mode (Un-Highlighed text)
                  ? 'text-gray-400 hover:text-white'
                  // Light Mode (Un-Highlighed text)
                  : 'text-[#e10000] hover:text-[#ffd787]'
              }`}
            >
              Experience
            </a>
            <a
              href="#projects"
              className={`font-bold block transition-all ${
                activeSection === 'projects'
                ? isDark 
                  // Dark Mode (Highlighed text)
                  ? 'text-green-400 animate-glow-dark' 
                  // Light Mode (Highlighed text)
                  : 'text-[#ff0000] animate-glow-light'
                : isDark 
                  // Dark Mode (Un-Highlighed text)
                  ? 'text-gray-400 hover:text-white'
                  // Light Mode (Un-Highlighed text)
                  : 'text-[#e10000] hover:text-[#ffd787]'
              }`}
            >
              Projects
            </a>
          </nav>
        </div>
        
        {/* Social Links */}
        <div className="flex space-x-4 mb-8">
          <a href="https://github.com" className="text-gray-400 transition-colors duration-200 ease-in-out hover:text-white">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
          <a href="https://linkedin.com" className="text-gray-400 transition-colors duration-200 ease-in-out hover:text-white">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
        </div>
      </div>
    </div>
    
  );
};

// Main Content Component (Scrollable)
const MainContent = ({isDark}) => {
  return (
    <div className="ml-[735px]">
      <div className="max-w-[950px] mx-auto px-32">
        <div className="pt-28 space-y-16">
          {/* About Section */}
          <section id="about" className="max-w-4xl">
            <h2 className={`text-3xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-[#503824]'
            }`}>About Me</h2>
              <div className={`space-y-4 ${
                isDark ? 'text-gray-400' : 'text-[#473222]'
              }`}>
              <p>
                I'm a Computer Science student at California State University Dominguez Hills, passionate about crafting digital experiences that combine innovative technology with practical solutions. My interests lie in developing applications and websites that not only solve real-world problems but are also built with clean, efficient code.
              </p>
              <p>
                Currently, I'm focused on expanding my technical expertise through hands-on projects while collaborating with fellow students to create meaningful applications. This collaborative environment has helped me develop a deeper understanding of software development principles and best practices.
              </p>
              <p>
                In my journey, I've had the opportunity to work across diverse settings — from electric companies handling critical infrastructure projects to retail operations and healthcare services. Additionally, I serve as a band leader at House of the Lord, where I combine my technical mindset with creative expression.
              </p>
              <p>
                When I'm not coding or studying, you can find me playing bass, working out at the gym, stargazing, or working on personal coding projects. I'm always excited to learn new technologies and contribute to the ever-evolving world of software development.
              </p>
              <p>
                Here are a few technologies I've been working with recently:
              </p>
              <ul className="grid grid-cols-3 gap-2 ml-4">
                <li className="flex items-center">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span> Python
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span> C++
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span> Java
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span> JavaScript (ES6+)
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span> React.js
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span> Node.js
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span> Tailwind CSS
                </li>
              </ul>
            </div>
          </section>

          {/* Experience Section */}
          <section id="experience" className="max-w-3xl">
            <h2 className={`text-3xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-[#503824]'
            }`}>Experience</h2>
            <div className="space-y-8">     

            {/*Firt Card*/}
            <div className={`p-6 rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-[#112240] hover:bg-[#1a2f70]'
                      : 'bg-[#e67f18] hover:bg-[#ff8c17]'
                  }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                  {/*Title*/}
                  <h3 className={`text-xl font-bold ${
                    isDark ? 'text-white' : 'text-[#503824]'
                    }`}>Civil Analyst</h3>

                  {/*Employer*/}
                    <p className={
                      isDark ? 'text-gray-400' : 'text-[#503824]'
                    }>Hampton Tedder Electric</p>
                  </div>

                  {/*Years Worked*/}
                  <span className={
                    isDark ? 'text-gray-400' : 'text-[#503824]'
                    }>10/2023 - 04/2024</span>
                </div>

                {/*Description text color*/}
                <ul className={`mt-4 space-y-3 ${
                  isDark ? 'text-gray-400' : 'text-[#503824]'
                  }`}>

                  {/*Descriptions*/}
                  <li className="flex items-start">
                    <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#e10000]'}`}>▹</span>
                    Input and maintain project specifications in company management system
                  </li>
                  <li className="flex items-start">
                    <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#e10000]'}`}>▹</span>
                    Oversee permit acquisition and ensure regulatory compliance
                  </li>
                  <li className="flex items-start">
                    <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#e10000]'}`}>▹</span>
                    Manage project closure and documentation processes
                  </li>
                  <li className="flex items-start">
                    <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#e10000]'}`}>▹</span>
                    Track project expenditures and allocate expenses
                  </li>
                </ul>
                
                {/* Box descriptions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Documentation</span>
                  <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Project Management</span>
                  <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Analysis</span>
                </div>
            </div>
            
            {/*Second Card*/}
            <div className={`p-6 rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-[#112240] hover:bg-[#1a2f70]'
                      : 'bg-[#e67f18] hover:bg-[#ff8c17]'
                  }`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  {/*Title*/}
                  <h3 className={`text-xl font-bold ${
                    isDark ? 'text-white' : 'text-[#503824]'
                    }`}>Bass Player & Band Leader</h3>
                  
                  {/*Employer*/}
                  <p className={
                      isDark ? 'text-gray-400' : 'text-[#503824]'
                    }>House of The Lord</p>
                </div>

                {/*Years Worked*/}
                <span className={
                    isDark ? 'text-gray-400' : 'text-[#503824]'
                    }>07/2018 - Present</span>
              </div>
              {/*Description text color*/}
              <ul className={`mt-4 space-y-3 ${
                  isDark ? 'text-gray-400' : 'text-[#503824]'
                  }`}>

                {/*Descriptions*/}
                <li className="flex items-start">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span>
                  Lead and coordinate worship band activities including arrangements and schedules
                </li>
                <li className="flex items-start">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span>
                  Organize and direct rehearsals while maintaining high musical standards
                </li>
                <li className="flex items-start">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span>
                  Adapt performance style to enhance worship atmosphere
                </li>
                <li className="flex items-start">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span>
                  Foster team collaboration and musical growth through mentorship and training
                </li>
              </ul>

              {/* Box descriptions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Leadership</span>
                <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Music</span>
                <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Team Management</span>
              </div>
            </div>

            {/*Third Card*/}
            <div className={`p-6 rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-[#112240] hover:bg-[#1a2f70]'
                      : 'bg-[#e67f18] hover:bg-[#ff8c17]'
                  }`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  {/*Title*/}
                  <h3 className={`text-xl font-bold ${
                    isDark ? 'text-white' : 'text-[#503824]'
                    }`}>Caregiver</h3>

                  {/*Employer*/}
                  <p className={
                      isDark ? 'text-gray-400' : 'text-[#503824]'
                    }>Right at Home</p>
                </div>

                {/*Years Worked*/}
                <span className={
                    isDark ? 'text-gray-400' : 'text-[#503824]'
                    }>07/2018 - 03/2023</span>
              </div>

              {/*Description text color*/}
              <ul className={`mt-4 space-y-3 ${
                  isDark ? 'text-gray-400' : 'text-[#503824]'
                  }`}>

                {/*Descriptions*/}
                <li className="flex items-start">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span>
                  Provided comprehensive patient care and assistance with daily activities
                </li>
                <li className="flex items-start">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span>
                  Maintained detailed patient records and vital sign monitoring
                </li>
                <li className="flex items-start">
                  <span className={`mr-2 text-sm ${isDark ? 'text-green-400' : 'text-[#b10000]'}`}>▹</span>
                  Managed household tasks while ensuring patient comfort and safety
                </li>
              </ul>

              {/* Box descriptions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Healthcare</span>
                <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Patient Care</span>
                <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Documentation</span>
              </div>
            </div>
          </div>

            {/* View Full Resume */}
              <div className="mt-4 ml-6">
              <a href="/JoseTrinidadTemblador_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className={`group inline-flex items-center text-sm transition-colors relative ${
                  isDark ? 'text-white hover:text-green-500' : 'text-[#503824] hover:text-[#ff0000]'
                }`}>
                  {/* Animated underlined part */}
                    <span className={`relative after:absolute after:w-[145px] after:h-[1px] after:bottom-0 after:left-0 after:scale-x-0 after:origin-left group-hover:after:scale-x-100 after:transition-transform ${
                        isDark ? 'after:bg-green-500' : 'after:bg-[#ff0000]'
                      }`}> View Full Resume
                    <span className="ml-2 transform group-hover:translate-x-2 transition-transform inline-block">→</span>
                  </span>
                </a>
            </div>
          </section>

          {/* Projects Section */}
          <section id="projects" className="max-w-3xl">
            <h2 className={`text-3xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-[#503824]'
            }`}>Some Things I've Built</h2>

            <div className="grid gap-6">
              <div className={`p-6 rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-[#112240] hover:bg-[#1a2f70]'
                      : 'bg-[#e67f18] hover:bg-[#ff8c17]'
                  }`}>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#503824]'}`}>Blackjack Game</h3>
                <p className={isDark ? 'text-gray-400' : 'text-[#503824]'}>
                  A console-based Blackjack game implemented in C++ utilizing Object-Oriented Programming principles. 
                  Features include player betting, multiple hands, and dealer AI. The project showcases the use of 
                  polymorphism and abstraction to create a modular and maintainable codebase.
                </p>
                <div className="flex space-x-4 ">
                  <a 
                    href="https://github.com/jtemblador/Portfolio/tree/main/Projects/Blackjack" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={
                      isDark ? 'text-green-400 hover:text-green-200' : 'text-[#ae0000] hover:text-[#ff0000]'
                    }>GitHub
                  </a>
                  {/**/}
                  <div className="relative group">
                    <span className={
                      isDark ? 'text-green-400 hover:text-green-200 cursor-pointer' : 'text-[#ae0000] hover:text-[#ff0000] cursor-pointer'
                    }>Live Demo</span>
                    <div className={`absolute hidden group-hover:block left-0 mt-2 p-2 rounded-lg shadow-lg z-10 ${
                        isDark ? 'bg-[#1a334d]' : 'bg-[#5e432e]'
                        }`}>
                      <img src="/src/assets/blackjack1.gif" alt="Blackjack Demo" className="max-w-[300px] rounded" />
                    </div>
                  </div>
                </div>
                
                {/* Box descriptions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>C++</span>

                  <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>OOP</span>

                  <span className={`text-sm rounded px-3 py-1 ${
                    isDark ? 'text-white bg-green-800' : 'text-[#ffe6cd] bg-[#b10000]'
                  }`}>Data Structures</span>
                </div>
              </div>
            </div>

            {/* View Portfolio Button */}
            <div className="mt-4 ml-6">
              <a href="/JoseTrinidadTemblador_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className={`group inline-flex items-center text-sm transition-colors relative ${
                  isDark ? 'text-white hover:text-green-500' : 'text-[#503824] hover:text-[#ff0000]'
                }`}>
                  {/* Animated underlined part */}
                    <span className={`relative after:absolute after:w-[149px] after:h-[1px] after:bottom-0 after:left-0 after:scale-x-0 after:origin-left group-hover:after:scale-x-100 after:transition-transform ${
                        isDark ? 'after:bg-green-500' : 'after:bg-[#ff0000]'
                      }`}> View Full Portfolio
                    <span className="ml-2 transform group-hover:translate-x-2 transition-transform inline-block">→</span>
                  </span>
                </a>
            </div>
            {/** extra padding at bottom of webpage */}
            <div className="pt-28  space-y-16"></div>
          </section>
        </div>
      </div>
    </div>
    
  );
};

// Main App Component
const App = () => {
  const [isDark, setIsDark] = React.useState(true);
  const [activeSection, setActiveSection] = React.useState('about');

  React.useEffect(() => {
    const handleMouseMove = (event) => {
      document.documentElement.style.setProperty('--mouse-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${event.clientY}px`);
    };
    
    const observerOptions = {
      root: null, // Observes within the viewport
      threshold: 0.5, // 50% of the section needs to be visible
    };

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = document.querySelectorAll('section[id]');
    
    window.addEventListener('mousemove', handleMouseMove);
    sections.forEach(section => observer.observe(section));

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      sections.forEach(section => observer.unobserve(section));
    };
  }, []);

  return (
    <div 
      className={`transition-colors duration-300 ${
        isDark ? 'bg-[#0a192f]' : 'bg-[#E6A96B]'
      }`}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div className="mouse-highlight" />
      <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
      <Sidebar activeSection={activeSection} isDark={isDark} />
      <MainContent isDark={isDark} />
    </div>
  );
};

export default App;