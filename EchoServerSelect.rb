require 'socket'
require 'logger'

$PORT = 8501

$counter = 0
$maxConnections = 0

$file = File.open('./logfiles/Select.log','w')
$logger = Logger.new($file)

#------------------------------------------------------------------------------------------------------------------
#-- FUNCTION: connectionStart
#--
#-- INTERFACE: connectionStart(conn)
#--            conn: The socket that has handled the connection of the client
#--
#-- NOTES:
#-- This function notifies that a client has connected (along with its IP and port) and then adds to the total clients connected counter
#----------------------------------------------------------------------------------------------------------------------

def connectionStart(conn)

 port, host = conn.peeraddr[1,2]
 client = "#{host}:#{port}"
 #puts "#{client} is connected"
 $counter=$counter + 1
 $maxConnections = $maxConnections + 1
 puts $counter.to_s+" clients connected"
 $logger.info "#{client} has connected"
 $logger.info $counter.to_s+" clients connected"
end

#------------------------------------------------------------------------------------------------------------------
#-- FUNCTION: connectionEnd
#--
#-- INTERFACE: connectionEnd(conn)
#--            conn: The socket that is facilitating the connection to the client
#-- NOTES:
#-- This function is executed at the end of a connection (when a client disconnects) and subtracts from the clients connected counter
#----------------------------------------------------------------------------------------------------------------------

def connectionEnd(conn)
   port, host = conn.peeraddr[1,2]
   client = "#{host}:#{port}"
   puts "#{client} has disconnected"
   $counter=$counter -1
   puts $counter.to_s+" clients connected"
   $logger.info "#{client} has connected"
   $logger.info $counter.to_s+" clients connected"

end 



##############################MAIN AREA#########################

#1. Create first socket
server = TCPServer.new($PORT)
connSockets = Array.new

#Call google to find out what the local IP is
ip = UDPSocket.open {|s| s.connect("64.233.187.99", 1); s.addr.last}
port = server.addr[1].to_s

$logger.info "Server started"
puts "Ready to receive on "+ ip +":" + port
connSockets.push(server)

#Make two threads, one that handles new connections, and the other that handles existing messages
t1 = Thread.new{
  #puts "Server thread started..."
  while 1 do

    #This is the server thread. It listens for server connections

  selectVars = IO.select(connSockets)
  #IMPORTANT POINT , connSockets is a dynamic array that can be changing. 
  #so when a new connection happens, it can be added to elsewhere

  #4. Inside select, check if it was triggered for data packets or a new connection
  #puts selectVars[0].size
  #puts selectVars[0]
  selectVars[0].each do |socketVar|
    if socketVar == connSockets[0]
      #puts "Triggered by server"
      #2A: The server socket only becomes active if its a new connection
      #so add the dude to the array
      newSocket = server.accept_nonblock;
      connSockets.push(newSocket)
      connectionStart(newSocket);
     
   end

 end

end
}

t2 = Thread.new{

  while 1 do

    selectVars = IO.select(connSockets)
      #IMPORTANT POINT , connSockets is a dynamic array that can be changing. 
      #so when a new connection happens, it can be added to elsewhere

      #4. Inside select, check if it was triggered for data packets or a new connection

      selectVars[0].each do |socketVar|
        if socketVar != connSockets[0]  
            if socketVar.eof
              connectionEnd(socketVar)
              connSockets.delete_if{|socket| socket == socketVar}
              #puts "Deleted from array"
              break
            else
              data = socketVar.read(1024)
              socketVar.write(data)
              socketVar.flush
            end #end for if
        end  #end for if 
      end #and for do
   end #end for while

}
t1.join
t2.join

 
