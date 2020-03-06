## code for the example used in AppOptics runtime metrics eventloop blog

First, this package only runs on Linux. If you run Linux or want to set up
a docker image feel free to clone it and play with it.

## install

`$ git clone https://github.com/appoptics/node-event-loop-blog`
`$ cd node-event-loop-blog`
`$ npm install`

It has only three direct dependencies: the AppOptics APM agent, express, and
multiload - a CLI tool for generating loads against a server.

## running it

It's designed to be run from terminal windows.

Make sure you have APPOPTICS_SERVICE_KEY defined in the environment. That's
necessary for `appoptics-apm` and for reporting application-specific
metrics. If you don't have a service key see the following section.

In one terminal execute `$ npm start` to start the server. It is hardcoded to
run on `localhost:8888` so change it if you need to.

In another terminal execute `$ npm run get-sync` or `$npm run get-async` to hit
the endpoint you choose. It will output the server response and append curl's
timing to the end of the line.

If you want to run a continuous load against it execute `$ npm run multiload`.

## If you don't have an AppOptics account

Get a free [dev edition](https://www.appoptics.com/free-apm-software) account
to view the data in real time. That's a free account limited to development
use, not a just free trial.

