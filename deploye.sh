#!/bin/bash

# create backup folder
echo "Creating backup directory ......."

NOW=$(date +"%m-%d-%Y")
DIRNAME=$NOW
SOURCE=./dist
TARGET=/home/administrator/$DIRNAME
SUBDIR=1
VAR=0
echo "Dirname " $DIRNAME

if [ ! -d "$TARGET" ];
then
    echo "Directory doesn't exist. Creating now"
    mkdir $TARGET
    echo "Directory created"
     if [ ! -d "$TARGET/$SUBDIR" ];
      then
       echo "Sub directory creating..."
       mkdir $TARGET/$SUBDIR
       echo "Sub directory created"
       echo "Copying dist directory to " $TARGET/$SUBDIR
       cp -r  $SOURCE $TARGET/$SUBDIR
       echo "Copying Complete "
       echo "point to dist directory..."
       cd $TARGET/$SUBDIR
       echo "run npm install... "
       npm install
       echo "npm install complete"
      fi
else
    echo "File exists"
    for (( i = 1; i <= 10; i++ ))
      do
        if [ ! -d "$TARGET/$i" ];
          then
            echo "Sub directory creating..."
            mkdir $TARGET/$i
            echo "Sub directory created"
            echo "Copying dist directory to " $TARGET/$i
            cp -r  $SOURCE $TARGET/$i
            echo "Copying Complete "
            break
        fi
    done
fi
