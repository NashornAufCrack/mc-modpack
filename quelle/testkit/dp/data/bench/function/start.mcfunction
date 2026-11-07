scoreboard objectives add bench dummy
gamemode spectator @s
time set noon
weather clear
tp @s 0 150 0 -90 15
scoreboard players set @s bench 0
tag @s add bench
tellraw @s [{"text":"[Benchmark] ","color":"green"},{"text":"3 Minuten Flug startet. Jetzt die FPS-Messung starten (FPS-Messung.bat) und im Chat: /sparkc profiler start --timeout 180","color":"white"}]
