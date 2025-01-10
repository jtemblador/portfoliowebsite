import React from 'react';

// Left Sidebar Component (Fixed)
const Sidebar = () => {
  return (
    <div className="fixed w-[400px] h-screen bg-[#0a192f] text-white p-16 flex flex-col justify-between">
      <div className="flex flex-col">
        <h1 className="text-5xl font-bold mb-4">Jose Temblador</h1>
        <h2 className="text-xl mb-6">Front End Engineer</h2>
        <p className="text-gray-400 mb-12 max-w-xs">
          I build accessible, pixel-perfect digital experiences for the web.
        </p>
        
        {/* Navigation Links */}
        <nav className="space-y-4">
          <a href="#about" className="block text-gray-400 hover:text-white transition-colors">About</a>
          <a href="#experience" className="block text-gray-400 hover:text-white transition-colors">Experience</a>
          <a href="#projects" className="block text-gray-400 hover:text-white transition-colors">Projects</a>
        </nav>
      </div>
      
      {/* Social Links */}
      <div className="flex space-x-4">
        <a href="https://github.com" className="text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </a>
        <a href="https://linkedin.com" className="text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        </a>
      </div>
    </div>
  );
};

// Main Content Component (Scrollable)
const MainContent = () => {
  return (
    <div className="ml-[400px] bg-[#0a192f] min-h-screen text-white">
      <div className="p-8 space-y-20">
        {/* About Section */}
        <section id="about" className="max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">About Me</h2>
          <div className="text-gray-400 space-y-4">
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
                <span className="text-green-400 mr-2">▹</span> Python
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">▹</span> C++
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">▹</span> Java
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">▹</span> JavaScript (ES6+)
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">▹</span> React.js
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">▹</span> Node.js
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">▹</span> Tailwind CSS
              </li>
            </ul>
          </div>
        </section>

        {/* Experience Section */}
        <section id="experience" className="max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">Experience</h2>
          <div className="space-y-8">
            <div className="bg-[#112240] p-6 rounded-lg hover:bg-[#1a2f70] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold text-white">Civil Analyst</h3>
                  <p className="text-gray-400">Hampton Tedder Electric</p>
                </div>
                <span className="text-gray-400">10/2023 - 04/2024</span>
              </div>
              <ul className="mt-4 space-y-3 text-gray-400">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Input and maintain project specifications in company management system
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Oversee permit acquisition and ensure regulatory compliance
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Manage project closure and documentation processes
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Track project expenditures and allocate expenses
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Project Management</span>
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Documentation</span>
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Analysis</span>
              </div>
            </div>

            <div className="bg-[#112240] p-6 rounded-lg hover:bg-[#1a2f70] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold text-white">Bass Player & Band Leader</h3>
                  <p className="text-gray-400">House of The Lord</p>
                </div>
                <span className="text-gray-400">07/2018 - Present</span>
              </div>
              <ul className="mt-4 space-y-3 text-gray-400">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Lead and coordinate worship band activities including arrangements and schedules
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Organize and direct rehearsals while maintaining high musical standards
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Adapt performance style to enhance worship atmosphere
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Foster team collaboration and musical growth through mentorship and training
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Leadership</span>
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Music</span>
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Team Management</span>
              </div>
            </div>

            <div className="bg-[#112240] p-6 rounded-lg hover:bg-[#1a2f70] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold text-white">Caregiver</h3>
                  <p className="text-gray-400">Right at Home</p>
                </div>
                <span className="text-gray-400">07/2018 - 03/2023</span>
              </div>
              <ul className="mt-4 space-y-3 text-gray-400">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Provided comprehensive patient care and assistance with daily activities
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Maintained detailed patient records and vital sign monitoring
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 text-sm">▹</span>
                  Managed household tasks while ensuring patient comfort and safety
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Healthcare</span>
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Patient Care</span>
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Documentation</span>
              </div>
            </div>
          </div>

          {/* View Full Resume */}
            <div className="mt-4 ml-6">
              <a
                href="/JoseTrinidadTemblador_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center text-sm text-white hover:text-green-400 transition-colors relative"
              >
                  <span className="relative after:absolute after:w-[145px] after:h-[1px] after:bg-green-400 after:bottom-0 after:left-0 after:scale-x-0 after:origin-left group-hover:after:scale-x-100 after:transition-transform">
                    View Full Resume
                  <span className="ml-2 transform group-hover:translate-x-2 transition-transform inline-block">→</span>
                </span>
              </a>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">Some Things I've Built</h2>
          <div className="grid gap-6">
            <div className="bg-[#112240] p-6 rounded-lg hover:bg-[#1a2f70] transition-colors">
              <h3 className="text-xl font-bold mb-2">Blackjack Game</h3>
              <p className="text-gray-400 mb-4">
                A console-based Blackjack game implemented in C++ utilizing Object-Oriented Programming principles. 
                Features include player betting, multiple hands, and dealer AI. The project showcases the use of 
                polymorphism and abstraction to create a modular and maintainable codebase.
              </p>
              <div className="flex space-x-4 ">
                <a 
                  href="https://github.com/jtemblador/Portfolio/tree/main/Projects/Blackjack" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-green-400 hover:text-green-300"
                >
                  GitHub
                </a>
                <div className="relative group">
                  <span className="text-green-400 hover:text-green-300 cursor-pointer">Live Demo</span>
                  <div className="absolute hidden group-hover:block left-0 mt-2 p-2 bg-[#1a334d] rounded-lg shadow-lg z-10">
                    <img src="/blackjack1.gif" alt="Blackjack Demo" className="max-w-[300px] rounded" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">C++</span>
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">OOP</span>
                <span className="text-sm bg-[#1a334d] rounded px-3 py-1">Data Structures</span>
              </div>
            </div>
          </div>

          {/* View Portfolio Button */}
          <div className="mt-4 ml-6">
            <a
              href="/JoseTrinidadTemblador_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center text-sm text-white hover:text-green-400 transition-colors relative"
  >
                <span className="relative after:absolute after:w-[145px] after:h-[1px] after:bg-green-400 after:bottom-0 after:left-0 after:scale-x-0 after:origin-left group-hover:after:scale-x-100 after:transition-transform">
                  View Full Portfolio
                <span className="ml-2 transform group-hover:translate-x-2 transition-transform inline-block">→</span>
              </span>
            </a>

          </div>
        </section>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  React.useEffect(() => {
    const handleMouseMove = (event) => {
      document.documentElement.style.setProperty('--mouse-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${event.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="bg-[#0a192f]">
      <div className="mouse-highlight" />
      <Sidebar />
      <MainContent />
    </div>
  );
};

export default App;