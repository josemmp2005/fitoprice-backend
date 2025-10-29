import fetch from 'node-fetch';

const runTest = async() => {
    const res = await fetch('http://localhost:3000/test');
    const data = await res.json();
    console.log(data);
};

runTest();