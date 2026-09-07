import axios from "axios";

const NetworkInstance = () => {
  return axios.create({
    baseURL: "https://bibleplus-backend-nhyo.onrender.com",
  });
};

export default NetworkInstance;
