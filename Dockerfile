FROM node:latest
RUN npm install -g truffle
RUN mkdir /idetix
WORKDIR /idetix
ADD . /idetix/
RUN npm install