echo "$dat:   Checking for pwdfile.properties file...."
if [ ! -f /home/linaro/Docker_scripts/soulScripts/pwdfile.properties ];then
	echo "$dat   Creating pwdfile.properties file"
	touch /home/linaro/Docker_scripts/soulScripts/pwdfile.properties
	chmod 777 /home/linaro/Docker_scripts/soulScripts/pwdfile.properties
	chown linaro:linaro /home/linaro/Docker_scripts/soulScripts/pwdfile.properties
fi

if [ -f /home/linaro/Docker_scripts/soulScripts/pwdfile.properties ];then
	echo "adding pwd"
	cd /home/linaro/Docker_scripts/soulScripts
	mosquitto_passwd -b pwdfile.properties 'CEDSystem' '@$0uL$y$tem'	
	mosquitto_passwd -b pwdfile.properties 'CEDHub' '@$0uL#ub'
	mosquitto_passwd -b pwdfile.properties 'CEDPython' '@$0uL|?yT#0n'
	mosquitto_passwd -b pwdfile.properties 'CEDDapi' '@$0uL|)@|?!'
	mosquitto_passwd -b pwdfile.properties 'CEDSensor' '@$en$0R'
	mosquitto_passwd -b pwdfile.properties 'CEDLight' '@L!9#t'
	mosquitto_passwd -b pwdfile.properties 'CEDHvac' '@#/@c'
	mosquitto_passwd -b pwdfile.properties 'CEDMusic' '@Mu$1c'
	mosquitto_passwd -b pwdfile.properties 'CEDShade' '@$#@|)e'
	mosquitto_passwd -b pwdfile.properties 'CEDcaseta' '@(@$et@'
	mosquitto_passwd -b pwdfile.properties 'CEDAir' '@@!R'
	mosquitto_passwd -b pwdfile.properties 'ANDCont' '@N|)(0Nt'
	mosquitto_passwd -b pwdfile.properties 'ANDInsta' '@N|)!N$t@'
	mosquitto_passwd -b pwdfile.properties 'IOSCont' '!0$(0Nt'
	mosquitto_passwd -b pwdfile.properties 'IOSInsta' '!0$!N$t@'
	mosquitto_passwd -b pwdfile.properties 'CEDStandalone' '@$t@N(|@|0ne'
	mosquitto_passwd -b pwdfile.properties 'CEDDiagnostic' '@|)i@gN0$t!('
	mosquitto_passwd -b pwdfile.properties 'CEDSystemaction' '@$y$tem@(t!0n'
	mosquitto_passwd -b pwdfile.properties 'CEDController' '@(Ntr0||eR'
	mosquitto_passwd -b pwdfile.properties 'CEDProcessMonitor' '@Pr0(e$sM0n!t0R'
	mosquitto_passwd -b pwdfile.properties 'WEBCont' 'VVeB(0nt'
	mosquitto_passwd -b pwdfile.properties 'WEBInsta' 'VVeB!N$t@'
	mosquitto_passwd -b pwdfile.properties 'WEBdefuser' 'VVeB|)e|=u$eR'
	mosquitto_passwd -b pwdfile.properties 'CEDScript' '@$0uL#ub'
else
	echo "creating file"
	cd /home/linaro/Docker_scripts/soulScripts
	mosquitto_passwd -c -b pwdfile.properties 'CEDSystem' '@$0uL$y$tem'	
	mosquitto_passwd -b pwdfile.properties 'CEDHub' '@$0uL#ub'
	mosquitto_passwd -b pwdfile.properties 'CEDPython' '@$0uL|?yT#0n'
	mosquitto_passwd -b pwdfile.properties 'CEDDapi' '@$0uL|)@|?!'
	mosquitto_passwd -b pwdfile.properties 'CEDSensor' '@$en$0R'
	mosquitto_passwd -b pwdfile.properties 'CEDLight' '@L!9#t'
	mosquitto_passwd -b pwdfile.properties 'CEDHvac' '@#/@c'
	mosquitto_passwd -b pwdfile.properties 'CEDMusic' '@Mu$1c'
	mosquitto_passwd -b pwdfile.properties 'CEDShade' '@$#@|)e'
	mosquitto_passwd -b pwdfile.properties 'CEDcaseta' '@(@$et@'
	mosquitto_passwd -b pwdfile.properties 'CEDAir' '@@!R'
	mosquitto_passwd -b pwdfile.properties 'ANDCont' '@N|)(0Nt'
	mosquitto_passwd -b pwdfile.properties 'ANDInsta' '@N|)!N$t@'
	mosquitto_passwd -b pwdfile.properties 'IOSCont' '!0$(0Nt'
	mosquitto_passwd -b pwdfile.properties 'IOSInsta' '!0$!N$t@'
	mosquitto_passwd -b pwdfile.properties 'CEDStandalone' '@$t@N(|@|0ne'
	mosquitto_passwd -b pwdfile.properties 'CEDDiagnostic' '@|)i@gN0$t!('
	mosquitto_passwd -b pwdfile.properties 'CEDSystemaction' '@$y$tem@(t!0n'
	mosquitto_passwd -b pwdfile.properties 'CEDController' '@(Ntr0||eR'
	mosquitto_passwd -b pwdfile.properties 'CEDProcessMonitor' '@Pr0(e$sM0n!t0R'
	mosquitto_passwd -b pwdfile.properties 'WEBCont' 'VVeB(0nt'
	mosquitto_passwd -b pwdfile.properties 'WEBInsta' 'VVeB!N$t@'
	mosquitto_passwd -b pwdfile.properties 'WEBdefuser' 'VVeB|)e|=u$eR'
	mosquitto_passwd -b pwdfile.properties 'CEDScript' '$(R!p+'
fi
