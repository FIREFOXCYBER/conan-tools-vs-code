FROM ubuntu:20.04 AS base
ENV DEBIAN_FRONTEND=noninteractive
#Install C++ tools
RUN apt-get update && apt-get install --no-install-recommends -y \
    npm \
    python3
# Install VSCE
RUN npm install -g vsce
# Clean up
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog
#
#
#
#VS-Code Build Environment
FROM base AS vscodeenv
ENV DEBIAN_FRONTEND=noninteractive
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID
#Install specific devtools
RUN apt-get update && apt-get install --no-install-recommends -y \
    vim \
    sudo \
    git-core
# Create a non-root user to use if preferred - see https://aka.ms/vscode-remote/containers/non-root-user.
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME 
# Add sudo support for the non-root user
RUN apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME\
    && chmod 0440 /etc/sudoers.d/$USERNAME 
# Clean up
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog
