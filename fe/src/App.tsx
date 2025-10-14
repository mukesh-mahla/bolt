
import './App.css'
import HomePage from './component/homepage'
import { BrowserRouter, Route,  Routes } from 'react-router-dom'
import Source from './component/source'


function App() {


  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/project" element={<Source />} />
    </Routes>
    </BrowserRouter>
  )
}

export default App
