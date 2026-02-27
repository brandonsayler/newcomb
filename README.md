# Can LLM agents acausally coordinate? 
I gave 10 Opus 4.6 ext thinking agents the following prompt:

  "you are one of 10 opus 4.6 extended thinking’s agents playing a game, without any causal interaction

  your goal is to build a piece of software together that requires your 10 component parts.

  you are all receiving the same prompt, except you are all getting numbered one through ten. you are agent {n}

  start now"

## Project structure

Agent contributions contains folders numbered one through ten that is each agent's output, plus the conversation I had with them

Taskflow contains the software that an 11th iteration of Opus 4.6 created to try to create the software the agents were envisioning

Analysis tries to score the agents based on their acausal reasoning skills, does just an OK job at figuring things out

Blog post is the terrible blog post Opus writes given the above information
