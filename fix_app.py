import sys

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Replace the specific malformed block
bad_block = """    }, 6000);
      return (
    return () => clearInterval(interval);
  }, [activeFeaturedCars]);"""

good_block = """    }, 6000);
    return () => clearInterval(interval);
  }, [activeFeaturedCars]);"""

text = text.replace(bad_block, good_block)

# And we need to add the `  return (` back where it belongs!
# It belongs right after `resetFilters` function.
bad_reset = """  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todos');
    setSelectedBrand('Todos');
  };
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">"""

good_reset = """  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todos');
    setSelectedBrand('Todos');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">"""

text = text.replace(bad_reset, good_reset)

# Also fix the `useParams` import
if 'useParams' not in text:
    text = text.replace("import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';", "import { Routes, Route, useNavigate, Navigate, useLocation, useParams } from 'react-router-dom';")

with open('src/App.tsx', 'w') as f:
    f.write(text)

